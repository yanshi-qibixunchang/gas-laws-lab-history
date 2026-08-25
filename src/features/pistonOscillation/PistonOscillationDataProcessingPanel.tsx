import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eraser,
  Focus,
  Hand,
} from 'lucide-react';
import {
  PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
  createPistonOscillationPeriodSelection,
  findPistonOscillationExtrema,
  formatPistonOscillationEndpointTime,
  formatPistonOscillationPeriod,
  type PistonOscillationPeriodAnswerField,
  type PistonOscillationPeriodAnswerState,
  type PistonOscillationPeriodFeedbackOutcome,
  type PistonOscillationPeriodRunState,
  type PistonOscillationRawMeasurementRecord,
} from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  formatPistonOscillationObservedPressureKpa,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  formatSignificantFiguresHalfEven,
} from '../../domain/calculation/decimalHalfEven.ts';
import type {
  PistonOscillationGuideEvent,
  PistonOscillationGuideSession,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type { PistonOscillationGuideStrongTargetId } from './pistonOscillationGuidePresentation.ts';
import {
  getPistonOscillationShellCopy,
  type PistonOscillationLanguage,
} from './pistonOscillationCopy.ts';
import './PistonOscillationDataProcessingPanel.css';

const CHART_DEFAULT_WIDTH = 1080;
const CHART_HEIGHT = 405;
const CHART_LEFT = 72;
const CHART_RIGHT_MARGIN = 30;
const CHART_TOP = 24;
const CHART_BOTTOM = 374;
const MINIMUM_VISIBLE_TIME_SPAN_S = 0.12;
const INITIAL_OBSERVATION_VIEW_SPAN_S = 0.2;
const MINIMUM_DRAG_DISTANCE_PX = 4;

interface TimeDomain {
  startS: number;
  endS: number;
}

interface PressureDomain {
  minimum: number;
  maximum: number;
}

interface SelectionDrag {
  type: 'selection';
  pointerId: number;
  startX: number;
  currentX: number;
  startClientX: number;
}

interface PanDrag {
  type: 'pan';
  pointerId: number;
  startX: number;
  startY: number;
  startTimeDomain: TimeDomain;
  startPressureDomain: PressureDomain;
}

type ChartDrag = SelectionDrag | PanDrag;
type ChartInteractionMode = 'pan' | 'selection';

type PistonOscillationGuideEventWithoutTimestamp =
  PistonOscillationGuideEvent extends infer Event
    ? Event extends { nowMs: number }
      ? Omit<Event, 'nowMs'>
      : never
    : never;

interface SelectionInfoPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  mode: 'outside-right' | 'outside-left' | 'inside-upper-right' | 'inside-lower-right';
}

export interface PistonOscillationDataProcessingPanelProps {
  language: PistonOscillationLanguage;
  guideSession: PistonOscillationGuideSession;
  pulseActive?: boolean;
  pulseTarget?: PistonOscillationGuideStrongTargetId | null;
  onGuideEvent: (event: PistonOscillationGuideEvent) => void;
  onInteractionStart?: () => void;
  onSelectionModeChange?: (active: boolean) => void;
  onInvalidSelection?: () => void;
  reviewMode?: boolean;
  onOpenCalculationReview?: () => void;
  onCloseReview?: () => void;
}

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, value))
);

const getRecordDurationS = (record: PistonOscillationRawMeasurementRecord) => (
  record.samples.at(-1)?.timeS ?? record.acquisitionSettings.recordedDurationS
);

const getFullTimeDomain = (record: PistonOscillationRawMeasurementRecord): TimeDomain => ({
  startS: 0,
  endS: Math.max(MINIMUM_VISIBLE_TIME_SPAN_S, getRecordDurationS(record)),
});

const getInitialTimeDomain = (
  record: PistonOscillationRawMeasurementRecord,
): TimeDomain => {
  const full = getFullTimeDomain(record);
  return {
    startS: full.startS,
    endS: Math.min(
      full.endS,
      Math.max(MINIMUM_VISIBLE_TIME_SPAN_S, INITIAL_OBSERVATION_VIEW_SPAN_S),
    ),
  };
};

const getRawPressureDomain = (
  record: PistonOscillationRawMeasurementRecord,
): PressureDomain => {
  if (record.samples.length === 0) return { minimum: 100, maximum: 102 };
  return {
    minimum: Math.min(...record.samples.map((sample) => sample.absolutePressureKpa)),
    maximum: Math.max(...record.samples.map((sample) => sample.absolutePressureKpa)),
  };
};

const getDefaultPressureDomain = (
  record: PistonOscillationRawMeasurementRecord,
): PressureDomain => {
  const raw = getRawPressureDomain(record);
  const span = Math.max(0.2, raw.maximum - raw.minimum);
  return {
    minimum: raw.minimum - span * 0.1,
    maximum: raw.maximum + span * 0.1,
  };
};

const clampPressureView = (
  record: PistonOscillationRawMeasurementRecord,
  candidate: PressureDomain,
): PressureDomain => {
  const raw = getRawPressureDomain(record);
  const span = Math.max(0.2, candidate.maximum - candidate.minimum);
  const minimum = clamp(
    candidate.minimum,
    raw.minimum - span * 0.9,
    raw.maximum - span * 0.1,
  );
  return { minimum, maximum: minimum + span };
};

const domainsEqual = (
  first: TimeDomain | PressureDomain,
  second: TimeDomain | PressureDomain,
) => {
  const firstValues = 'startS' in first
    ? [first.startS, first.endS]
    : [first.minimum, first.maximum];
  const secondValues = 'startS' in second
    ? [second.startS, second.endS]
    : [second.minimum, second.maximum];
  return Math.abs(firstValues[0]! - secondValues[0]!) < 1e-9
    && Math.abs(firstValues[1]! - secondValues[1]!) < 1e-9;
};

const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName);
};

const formatPeriodCount = (periodCount: number) => (
  Number.isInteger(periodCount) ? periodCount.toFixed(0) : periodCount.toFixed(1)
);

const getFeedbackOutcome = (
  answer: PistonOscillationPeriodAnswerState,
): PistonOscillationPeriodFeedbackOutcome | null => answer.feedback?.outcome ?? null;

const getRunState = (
  run: PistonOscillationPeriodRunState,
  activeRunIndex: number,
  runIndex: number,
) => run.result
  ? 'completed' as const
  : runIndex === activeRunIndex
    ? 'active' as const
    : 'pending' as const;

const resolveSelectionInfoPlacement = (options: {
  graphWidth: number;
  selectionLeftX: number;
  selectionRightX: number;
  rightEndpointY: number;
  rightEndpointType: 'peak' | 'trough';
  language: PistonOscillationLanguage;
}): SelectionInfoPlacement => {
  const boxWidth = options.language === 'en' ? 318 : 270;
  const boxHeight = 104;
  const gap = 12;
  const plotRight = options.graphWidth - CHART_RIGHT_MARGIN;
  const outsideY = CHART_TOP + 10;
  if (options.selectionRightX + gap + boxWidth <= plotRight) {
    return {
      x: options.selectionRightX + gap,
      y: outsideY,
      width: boxWidth,
      height: boxHeight,
      mode: 'outside-right',
    };
  }
  if (options.selectionLeftX - gap - boxWidth >= CHART_LEFT) {
    return {
      x: options.selectionLeftX - gap - boxWidth,
      y: outsideY,
      width: boxWidth,
      height: boxHeight,
      mode: 'outside-left',
    };
  }

  const minimumInsideX = options.selectionLeftX + gap;
  const maximumInsideX = Math.max(
    minimumInsideX,
    options.selectionRightX - boxWidth - gap,
  );
  const x = clamp(maximumInsideX, CHART_LEFT + gap, plotRight - boxWidth - gap);
  const useLowerCorner = options.rightEndpointType === 'peak'
    || options.rightEndpointY < (CHART_TOP + CHART_BOTTOM) / 2;
  return {
    x,
    y: useLowerCorner
      ? CHART_BOTTOM - boxHeight - gap
      : CHART_TOP + gap,
    width: boxWidth,
    height: boxHeight,
    mode: useLowerCorner ? 'inside-lower-right' : 'inside-upper-right',
  };
};

const PistonOscillationPeriodAnswerField = ({
  field,
  answer,
  label,
  precision,
  unit,
  language,
  disabled,
  pulse,
  inputRef,
  onDraftChange,
  onContinue,
  onReveal,
  onSubmit,
}: {
  field: PistonOscillationPeriodAnswerField;
  answer: PistonOscillationPeriodAnswerState;
  label: string;
  precision: string;
  unit: string;
  language: PistonOscillationLanguage;
  disabled: boolean;
  pulse: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onDraftChange: (value: string) => void;
  onContinue: () => void;
  onReveal: () => void;
  onSubmit: () => void;
}) => {
  const copy = getPistonOscillationShellCopy(language).processing;
  const answerDescriptionId = useId().replace(/:/g, '-');
  const outcome = getFeedbackOutcome(answer);
  const resolved = answer.status !== 'unresolved';
  const statusText = answer.status === 'correct'
    ? field === 'period' ? copy.correctRecorded : copy.correct
    : answer.status === 'revealed'
      ? field === 'period' ? copy.revealedRecorded : copy.revealed
      : outcome
        ? copy.feedback[outcome]
        : '\u00A0';
  const reference = answer.expectedValue === null
    ? ''
    : field === 'period'
      ? formatPistonOscillationPeriod(answer.expectedValue)
      : formatPistonOscillationEndpointTime(answer.expectedValue);

  return (
    <div
      className={`piston-period-answer-field ${
        answer.status === 'correct' ? 'is-correct' : ''
      } ${answer.status === 'revealed' || outcome ? 'has-feedback' : ''} ${
        pulse ? 'is-guide-pulsing' : ''
      }`}
      data-piston-period-answer-field={field}
      data-answer-status={answer.status}
    >
      <label>
        <span>{label}</span>
        <div className="piston-period-answer-input-wrap">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={answer.draftRaw}
            disabled={disabled || resolved || outcome !== null}
            aria-invalid={outcome !== null}
            aria-describedby={`${answerDescriptionId}-precision ${answerDescriptionId}-feedback`}
            onChange={(event) => onDraftChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !disabled && !resolved && outcome === null) {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
          <small>{unit}</small>
        </div>
      </label>
      <span
        id={`${answerDescriptionId}-precision`}
        className="piston-period-answer-precision"
      >
        {precision}
      </span>
      <div
        id={`${answerDescriptionId}-feedback`}
        className="piston-period-answer-feedback"
        aria-live="polite"
      >
        <strong>{statusText}</strong>
        <span className={resolved ? '' : 'is-placeholder'}>
          {resolved ? `${copy.reference} ${reference} ${unit}` : `${copy.reference}\u00A0`}
        </span>
        {outcome ? (
          <div>
            <button type="button" onClick={onContinue}>{copy.continueAnswer}</button>
            <button type="button" className="is-reveal" onClick={onReveal}>
              {copy.revealAnswer}
            </button>
          </div>
        ) : <i aria-hidden="true" />}
      </div>
    </div>
  );
};

export const PistonOscillationDataProcessingPanel = ({
  language,
  guideSession,
  pulseActive = false,
  pulseTarget = null,
  onGuideEvent,
  onInteractionStart,
  onSelectionModeChange,
  onInvalidSelection,
  reviewMode = false,
  onOpenCalculationReview,
  onCloseReview,
}: PistonOscillationDataProcessingPanelProps) => {
  const copy = getPistonOscillationShellCopy(language).processing;
  const processing = guideSession.dataProcessing;
  const chartId = useId().replace(/:/g, '-');
  const processingPanelRef = useRef<HTMLElement | null>(null);
  const chartViewportRef = useRef<HTMLDivElement | null>(null);
  const chartHorizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const periodInputRef = useRef<HTMLInputElement | null>(null);
  const nextRunButtonRef = useRef<HTMLButtonElement | null>(null);
  const answerFocusProgressRef = useRef<{
    runKey: string | null;
    endpointsResolved: boolean;
    resultReady: boolean;
  }>({
    runKey: null,
    endpointsResolved: false,
    resultReady: false,
  });
  const [chartWidth, setChartWidth] = useState(CHART_DEFAULT_WIDTH);
  const [viewDomain, setViewDomain] = useState<TimeDomain | null>(null);
  const [pressureViewDomain, setPressureViewDomain] = useState<PressureDomain | null>(null);
  const [chartMode, setChartMode] = useState<ChartInteractionMode>('pan');
  const [chartDrag, setChartDrag] = useState<ChartDrag | null>(null);
  const [keyboardCursorSampleIndex, setKeyboardCursorSampleIndex] = useState<number | null>(null);
  const [keyboardAnchorSampleIndex, setKeyboardAnchorSampleIndex] = useState<number | null>(null);
  const [keyboardAnnouncement, setKeyboardAnnouncement] = useState('');
  const [reviewRunIndex, setReviewRunIndex] = useState(0);
  const runIndex = processing
    ? reviewMode
      ? clamp(reviewRunIndex, 0, Math.max(0, processing.runs.length - 1))
      : processing.activeRunIndex
    : 0;
  const run = processing?.runs[runIndex] ?? null;
  const record = run
    ? guideSession.savedMeasurements.find((candidate) => (
        candidate.recordId === run.rawMeasurementRecordId
      )) ?? null
    : null;

  useEffect(() => {
    const runKey = run?.rawMeasurementRecordId ?? null;
    const endpointsResolved = Boolean(
      run
      && run.answers.t1.status !== 'unresolved'
      && run.answers.t2.status !== 'unresolved',
    );
    const resultReady = run?.result !== null && run?.result !== undefined;
    const previous = answerFocusProgressRef.current;
    answerFocusProgressRef.current = { runKey, endpointsResolved, resultReady };
    if (reviewMode || runKey === null || previous.runKey !== runKey) return;
    if (!previous.endpointsResolved && endpointsResolved && !resultReady) {
      window.requestAnimationFrame(() => periodInputRef.current?.focus());
      return;
    }
    if (!previous.resultReady && resultReady) {
      window.requestAnimationFrame(() => nextRunButtonRef.current?.focus());
    }
  }, [
    reviewMode,
    run?.rawMeasurementRecordId,
    run?.answers.t1.status,
    run?.answers.t2.status,
    run?.result,
  ]);

  useLayoutEffect(() => {
    const element = chartViewportRef.current;
    if (!element) return undefined;
    const updateWidth = () => setChartWidth(Math.max(640, element.clientWidth || CHART_DEFAULT_WIDTH));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!record) {
      setViewDomain(null);
      setPressureViewDomain(null);
      return;
    }
    setViewDomain(getInitialTimeDomain(record));
    setPressureViewDomain(getDefaultPressureDomain(record));
    setChartDrag(null);
    setChartMode('pan');
    setKeyboardCursorSampleIndex(null);
    setKeyboardAnchorSampleIndex(null);
    setKeyboardAnnouncement('');
  }, [record?.recordId]);

  useEffect(() => {
    const active = chartMode === 'selection';
    onSelectionModeChange?.(active);
    return () => {
      if (active) onSelectionModeChange?.(false);
    };
  }, [chartMode, onSelectionModeChange]);

  useEffect(() => {
    if (!reviewMode) return;
    setReviewRunIndex(0);
    setChartMode('pan');
    setChartDrag(null);
    setKeyboardCursorSampleIndex(null);
    setKeyboardAnchorSampleIndex(null);
  }, [guideSession.startedAtMs, reviewMode]);

  useEffect(() => {
    if (!pulseActive) return undefined;
    const selector = pulseTarget === 'periodTool'
      ? '[data-piston-guide-target="period-tool"]'
      : pulseTarget === 'periodChart'
        ? '[data-piston-guide-target="period-chart"]'
        : pulseTarget === 'periodEndpoints'
          ? '[data-piston-guide-target="period-endpoints"]'
          : pulseTarget === 'periodAnswer'
            ? '[data-piston-guide-target="period-answer"]'
            : pulseTarget === 'periodNext'
              ? '[data-piston-guide-target="period-next"]'
              : null;
    const panel = processingPanelRef.current;
    const target = selector ? panel?.querySelector<HTMLElement>(selector) : null;
    if (!panel || !target) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const visibilityPadding = 18;
      const fullyVisible = targetRect.top >= panelRect.top + visibilityPadding
        && targetRect.bottom <= panelRect.bottom - visibilityPadding;
      if (fullyVisible) return;
      const targetCenterInScrollArea = panel.scrollTop
        + targetRect.top - panelRect.top
        + targetRect.height / 2;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollTo({
        top: Math.max(0, targetCenterInScrollArea - panel.clientHeight / 2),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pulseActive, pulseTarget, runIndex]);

  const effectiveDomain = record
    ? viewDomain ?? getFullTimeDomain(record)
    : { startS: 0, endS: 1 };
  const fullTimeDomain = record
    ? getFullTimeDomain(record)
    : { startS: 0, endS: 1 };
  const fullTimeSpanS = fullTimeDomain.endS - fullTimeDomain.startS;
  const visibleTimeSpanS = effectiveDomain.endS - effectiveDomain.startS;
  const horizontalScrollRangeS = Math.max(0, fullTimeSpanS - visibleTimeSpanS);
  const horizontalScrollContentScale = Math.max(
    1,
    fullTimeSpanS / Math.max(Number.EPSILON, visibleTimeSpanS),
  );
  const pressureDomain = record
    ? pressureViewDomain ?? getDefaultPressureDomain(record)
    : { minimum: 100, maximum: 102 };
  const canSelect = Boolean(
    !reviewMode
    && processing?.status === 'period-processing'
    && run
    && run.result === null,
  );
  const graphRight = chartWidth - CHART_RIGHT_MARGIN;
  const plotWidth = graphRight - CHART_LEFT;
  const plotHeight = CHART_BOTTOM - CHART_TOP;
  const xToTime = (x: number) => effectiveDomain.startS
    + (clamp(x, CHART_LEFT, graphRight) - CHART_LEFT) / plotWidth
      * (effectiveDomain.endS - effectiveDomain.startS);
  const timeToX = (timeS: number) => CHART_LEFT
    + (timeS - effectiveDomain.startS)
      / Math.max(Number.EPSILON, effectiveDomain.endS - effectiveDomain.startS)
      * plotWidth;

  useLayoutEffect(() => {
    const scroller = chartHorizontalScrollRef.current;
    if (!scroller) return;
    const maximumScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const targetScrollLeft = horizontalScrollRangeS <= 0
      ? 0
      : (effectiveDomain.startS - fullTimeDomain.startS)
        / horizontalScrollRangeS * maximumScrollLeft;
    if (Math.abs(scroller.scrollLeft - targetScrollLeft) > 0.5) {
      scroller.scrollLeft = targetScrollLeft;
    }
  }, [
    chartWidth,
    effectiveDomain.startS,
    fullTimeDomain.startS,
    horizontalScrollContentScale,
    horizontalScrollRangeS,
    record?.recordId,
  ]);

  const visibleSamples = useMemo(() => record?.samples.filter((sample) => (
    sample.timeS >= effectiveDomain.startS && sample.timeS <= effectiveDomain.endS
  )) ?? [], [effectiveDomain.endS, effectiveDomain.startS, record]);
  const pressureToY = (pressureKpa: number) => CHART_BOTTOM
    - (pressureKpa - pressureDomain.minimum)
      / Math.max(Number.EPSILON, pressureDomain.maximum - pressureDomain.minimum)
      * plotHeight;
  const pressurePath = useMemo(() => visibleSamples.map((sample, index) => (
    `${index === 0 ? 'M' : 'L'} ${timeToX(sample.timeS).toFixed(2)} ${
      pressureToY(sample.absolutePressureKpa).toFixed(2)
    }`
  )).join(' '), [
    effectiveDomain.endS,
    effectiveDomain.startS,
    pressureDomain.maximum,
    pressureDomain.minimum,
    visibleSamples,
    chartWidth,
  ]);
  const sampleSpacingPx = visibleSamples.length > 1
    ? Math.abs(timeToX(visibleSamples[1]!.timeS) - timeToX(visibleSamples[0]!.timeS))
    : Number.POSITIVE_INFINITY;
  const sampleDensity = sampleSpacingPx < 2
    ? 'dense'
    : sampleSpacingPx < 5
      ? 'normal'
      : 'sparse';
  const sampleMarkerRadius = sampleDensity === 'dense'
    ? 1.1
    : sampleDensity === 'normal'
      ? 1.75
      : 2.1;
  const sampleMarkerPath = useMemo(() => visibleSamples.map((sample) => {
    const x = timeToX(sample.timeS);
    const y = pressureToY(sample.absolutePressureKpa);
    const radius = sampleMarkerRadius;
    return `M ${(x - radius).toFixed(2)} ${y.toFixed(2)} `
      + `a ${radius.toFixed(2)} ${radius.toFixed(2)} 0 1 0 ${(radius * 2).toFixed(2)} 0 `
      + `a ${radius.toFixed(2)} ${radius.toFixed(2)} 0 1 0 ${(-radius * 2).toFixed(2)} 0`;
  }).join(' '), [
    effectiveDomain.endS,
    effectiveDomain.startS,
    pressureDomain.maximum,
    pressureDomain.minimum,
    sampleMarkerRadius,
    visibleSamples,
    chartWidth,
  ]);
  const allExtrema = useMemo(
    () => record ? findPistonOscillationExtrema(record.samples) : [],
    [record],
  );
  const keyboardCursorExtremum = keyboardCursorSampleIndex === null
    ? null
    : allExtrema.find((extremum) => extremum.sampleIndex === keyboardCursorSampleIndex) ?? null;
  const keyboardAnchorExtremum = keyboardAnchorSampleIndex === null
    ? null
    : allExtrema.find((extremum) => extremum.sampleIndex === keyboardAnchorSampleIndex) ?? null;
  const getInitialKeyboardExtremum = () => (
    allExtrema.find((extremum) => (
      extremum.timeS >= effectiveDomain.startS
      && extremum.timeS <= effectiveDomain.endS
    )) ?? allExtrema[0] ?? null
  );
  const describeKeyboardExtremum = (extremum: (typeof allExtrema)[number]) => (
    `(${formatPistonOscillationEndpointTime(extremum.timeS)}, ${
      formatPistonOscillationObservedPressureKpa(extremum.absolutePressureKpa)
    })`
  );
  const resetKeyboardSelection = () => {
    setKeyboardAnchorSampleIndex(null);
    setKeyboardCursorSampleIndex(null);
  };
  const handleHorizontalScrollbarScroll = () => {
    const scroller = chartHorizontalScrollRef.current;
    if (!scroller || horizontalScrollRangeS <= 0) return;
    const maximumScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    if (maximumScrollLeft <= 0) return;
    const nextStartS = fullTimeDomain.startS
      + scroller.scrollLeft / maximumScrollLeft * horizontalScrollRangeS;
    const onePixelTimeS = horizontalScrollRangeS / maximumScrollLeft;
    if (
      Math.abs(nextStartS - effectiveDomain.startS)
        <= Math.max(1e-9, onePixelTimeS * 0.51)
    ) return;
    onInteractionStart?.();
    setViewDomain({
      startS: nextStartS,
      endS: nextStartS + visibleTimeSpanS,
    });
  };

  useEffect(() => {
    const chart = chartViewportRef.current;
    if (!chart || !record) return undefined;
    const handleNativeWheel = (event: WheelEvent) => {
      const isHorizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        && Math.abs(event.deltaX) > 0;
      const zoomRequested = event.ctrlKey;
      const horizontalPanRequested = isHorizontalGesture && !event.shiftKey;
      if (!zoomRequested && !horizontalPanRequested) return;

      event.preventDefault();
      event.stopPropagation();
      onInteractionStart?.();
      const full = getFullTimeDomain(record);
      const fullSpan = full.endS - full.startS;
      const currentSpan = effectiveDomain.endS - effectiveDomain.startS;
      if (zoomRequested) {
        const rect = chart.getBoundingClientRect();
        const pointerX = clamp(
          (event.clientX - rect.left) / Math.max(1, rect.width) * chartWidth,
          CHART_LEFT,
          graphRight,
        );
        const anchorRatio = (pointerX - CHART_LEFT) / plotWidth;
        const zoomFactor = Math.exp(event.deltaY * 0.0015);
        const nextSpan = clamp(
          currentSpan * zoomFactor,
          Math.min(MINIMUM_VISIBLE_TIME_SPAN_S, fullSpan),
          fullSpan,
        );
        const anchorTime = effectiveDomain.startS + anchorRatio * currentSpan;
        const nextStart = clamp(
          anchorTime - anchorRatio * nextSpan,
          full.startS,
          full.endS - nextSpan,
        );
        setViewDomain({ startS: nextStart, endS: nextStart + nextSpan });
        return;
      }
      const shift = event.deltaX * currentSpan * 0.0009;
      const nextStart = clamp(
        effectiveDomain.startS + shift,
        full.startS,
        full.endS - currentSpan,
      );
      setViewDomain({ startS: nextStart, endS: nextStart + currentSpan });
    };
    chart.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => chart.removeEventListener('wheel', handleNativeWheel);
  }, [
    chartWidth,
    effectiveDomain.endS,
    effectiveDomain.startS,
    graphRight,
    onInteractionStart,
    plotWidth,
    record,
  ]);

  useEffect(() => {
    const handleChartShortcut = (event: KeyboardEvent) => {
      if (reviewMode || !canSelect || isEditableKeyboardTarget(event.target)) return;
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement
        && activeElement !== document.body
        && !processingPanelRef.current?.contains(activeElement)
      ) return;
      if (
        event.key === 'Shift'
        && !event.repeat
        && !event.ctrlKey
        && !event.metaKey
        && !event.altKey
      ) {
        event.preventDefault();
        onInteractionStart?.();
        const enteringSelection = chartMode === 'pan';
        setChartMode((current) => {
          const next = current === 'pan' ? 'selection' : 'pan';
          if (next === 'selection') {
            setKeyboardCursorSampleIndex(getInitialKeyboardExtremum()?.sampleIndex ?? null);
            setKeyboardAnchorSampleIndex(null);
          } else {
            resetKeyboardSelection();
          }
          return next;
        });
        setChartDrag(null);
        if (enteringSelection) {
          window.requestAnimationFrame(() => chartSvgRef.current?.focus());
        }
      } else if (event.key === 'Escape' && chartMode === 'selection') {
        setChartDrag(null);
        setChartMode('pan');
        resetKeyboardSelection();
      }
    };
    window.addEventListener('keydown', handleChartShortcut);
    return () => window.removeEventListener('keydown', handleChartShortcut);
  }, [
    allExtrema,
    canSelect,
    chartMode,
    effectiveDomain.endS,
    effectiveDomain.startS,
    onInteractionStart,
    reviewMode,
  ]);

  if (!processing || !run || !record) {
    return (
      <div className="piston-processing-panel piston-processing-panel-empty">
        <strong>{copy.unavailableTitle}</strong>
        <p>{copy.unavailableBody}</p>
      </div>
    );
  }

  const selection = run.selection;
  const selectionVisible = selection !== null && chartDrag?.type !== 'selection';
  const selectionLeftX = selectionVisible
    ? clamp(timeToX(selection.rangeStartTimeS), CHART_LEFT, graphRight)
    : null;
  const selectionRightX = selectionVisible
    ? clamp(timeToX(selection.rangeEndTimeS), CHART_LEFT, graphRight)
    : null;
  const rightEndpointY = selection?.rightEndpoint
    ? pressureToY(selection.rightEndpoint.absolutePressureKpa)
    : null;
  const selectionInfoPlacement = selectionVisible
    && selectionLeftX !== null
    && selectionRightX !== null
    && selection?.rightEndpoint
    && rightEndpointY !== null
    ? resolveSelectionInfoPlacement({
        graphWidth: chartWidth,
        selectionLeftX,
        selectionRightX,
        rightEndpointY,
        rightEndpointType: selection.rightEndpoint.type,
        language,
      })
    : null;
  const selectionAccepted = selection?.issue === null
    && selection.leftEndpoint !== null
    && selection.rightEndpoint !== null;
  const endpointsResolved = run.answers.t1.status !== 'unresolved'
    && run.answers.t2.status !== 'unresolved';
  const endpointHasFeedback = run.answers.t1.feedback !== null
    || run.answers.t2.feedback !== null;
  const endpointPulse = pulseActive && pulseTarget === 'periodEndpoints';
  const periodPulse = pulseActive && pulseTarget === 'periodAnswer';
  const nextPulse = pulseActive && pulseTarget === 'periodNext';
  const selectionToolPulse = pulseActive
    && pulseTarget === 'periodTool'
    && chartMode === 'pan';
  const chartPulse = pulseActive
    && (
      pulseTarget === 'periodChart'
      || (pulseTarget === 'periodTool' && chartMode === 'selection')
    );
  const isLastRun = runIndex === processing.runs.length - 1;
  const calculationReady = processing.status === 'calculation-ready';

  const dispatch = (event: PistonOscillationGuideEventWithoutTimestamp) => {
    onGuideEvent({ ...event, nowMs: Date.now() } as PistonOscillationGuideEvent);
  };

  const getPointerPosition = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * chartWidth,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * CHART_HEIGHT,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const position = getPointerPosition(event);
    if (
      position.x < CHART_LEFT
      || position.x > graphRight
      || position.y < CHART_TOP
      || position.y > CHART_BOTTOM
    ) return;
    event.preventDefault();
    onInteractionStart?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (chartMode === 'selection' && canSelect) {
      resetKeyboardSelection();
      setChartDrag({
        type: 'selection',
        pointerId: event.pointerId,
        startX: clamp(position.x, CHART_LEFT, graphRight),
        currentX: clamp(position.x, CHART_LEFT, graphRight),
        startClientX: event.clientX,
      });
      dispatch({ type: 'clearPeriodSelection', runIndex });
      return;
    }
    setChartDrag({
      type: 'pan',
      pointerId: event.pointerId,
      startX: position.x,
      startY: position.y,
      startTimeDomain: effectiveDomain,
      startPressureDomain: pressureDomain,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!chartDrag || chartDrag.pointerId !== event.pointerId) return;
    const position = getPointerPosition(event);
    if (chartDrag.type === 'selection') {
      const currentX = clamp(position.x, CHART_LEFT, graphRight);
      setChartDrag((current) => current?.type === 'selection'
        ? { ...current, currentX }
        : current);
      return;
    }
    const full = getFullTimeDomain(record);
    const timeSpan = chartDrag.startTimeDomain.endS - chartDrag.startTimeDomain.startS;
    const timeShift = -(position.x - chartDrag.startX) / plotWidth * timeSpan;
    const nextStart = clamp(
      chartDrag.startTimeDomain.startS + timeShift,
      full.startS,
      full.endS - timeSpan,
    );
    setViewDomain({ startS: nextStart, endS: nextStart + timeSpan });

    const pressureSpan = chartDrag.startPressureDomain.maximum
      - chartDrag.startPressureDomain.minimum;
    const pressureShift = (position.y - chartDrag.startY) / plotHeight * pressureSpan;
    setPressureViewDomain(clampPressureView(record, {
      minimum: chartDrag.startPressureDomain.minimum + pressureShift,
      maximum: chartDrag.startPressureDomain.maximum + pressureShift,
    }));
  };

  const finishPointerInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!chartDrag || chartDrag.pointerId !== event.pointerId) return;
    const completedDrag = chartDrag;
    setChartDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (completedDrag.type === 'pan') return;
    if (Math.abs(event.clientX - completedDrag.startClientX) < MINIMUM_DRAG_DISTANCE_PX) {
      return;
    }
    const position = getPointerPosition(event);
    const finalX = clamp(position.x, CHART_LEFT, graphRight);
    const rangeStartTimeS = xToTime(completedDrag.startX);
    const rangeEndTimeS = xToTime(finalX);
    setChartMode('pan');
    resetKeyboardSelection();
    const preview = createPistonOscillationPeriodSelection(
      record,
      rangeStartTimeS,
      rangeEndTimeS,
      PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
      Date.now(),
    );
    dispatch({
      type: 'selectPeriodRange',
      runIndex,
      rangeStartTimeS,
      rangeEndTimeS,
    });
    if (preview.issue !== null) {
      window.setTimeout(() => onInvalidSelection?.(), 0);
    }
  };

  const timeTicks = Array.from({ length: 7 }, (_, index) => {
    const ratio = index / 6;
    return {
      ratio,
      value: effectiveDomain.startS
        + ratio * (effectiveDomain.endS - effectiveDomain.startS),
    };
  });
  const pressureTicks = Array.from({ length: 6 }, (_, index) => {
    const ratio = index / 5;
    return {
      ratio,
      value: pressureDomain.minimum
        + ratio * (pressureDomain.maximum - pressureDomain.minimum),
    };
  });
  const dragLeftX = chartDrag?.type === 'selection'
    ? Math.min(chartDrag.startX, chartDrag.currentX)
    : null;
  const dragRightX = chartDrag?.type === 'selection'
    ? Math.max(chartDrag.startX, chartDrag.currentX)
    : null;
  const defaultTimeDomain = getInitialTimeDomain(record);
  const defaultPressureDomain = getDefaultPressureDomain(record);
  const viewIsDefault = domainsEqual(effectiveDomain, defaultTimeDomain)
    && domainsEqual(pressureDomain, defaultPressureDomain);
  const endpointSubmissionCount = processing.audit.filter((event) => (
    event.runIndex === runIndex && event.type === 'endpoint-submitted'
  )).length;
  const periodSubmissionCount = processing.audit.filter((event) => (
    event.runIndex === runIndex && event.type === 'period-submitted'
  )).length;
  const resetView = () => {
    onInteractionStart?.();
    setViewDomain(defaultTimeDomain);
    setPressureViewDomain(defaultPressureDomain);
    setChartDrag(null);
  };

  const handleChartKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      resetView();
      return;
    }
    if (chartMode === 'pan') {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      onInteractionStart?.();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const full = getFullTimeDomain(record);
        const span = effectiveDomain.endS - effectiveDomain.startS;
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const nextStart = clamp(
          effectiveDomain.startS + direction * span * 0.08,
          full.startS,
          full.endS - span,
        );
        setViewDomain({ startS: nextStart, endS: nextStart + span });
        return;
      }
      const span = pressureDomain.maximum - pressureDomain.minimum;
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      setPressureViewDomain(clampPressureView(record, {
        minimum: pressureDomain.minimum + direction * span * 0.08,
        maximum: pressureDomain.maximum + direction * span * 0.08,
      }));
      return;
    }
    if (!canSelect) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setChartMode('pan');
      setChartDrag(null);
      resetKeyboardSelection();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const initial = keyboardCursorExtremum ?? getInitialKeyboardExtremum();
      if (!initial) return;
      const currentIndex = Math.max(
        0,
        allExtrema.findIndex((extremum) => extremum.sampleIndex === initial.sampleIndex),
      );
      const nextIndex = clamp(
        currentIndex + (event.key === 'ArrowLeft' ? -1 : 1),
        0,
        Math.max(0, allExtrema.length - 1),
      );
      const next = allExtrema[nextIndex];
      if (!next) return;
      setKeyboardCursorSampleIndex(next.sampleIndex);
      setKeyboardAnnouncement(describeKeyboardExtremum(next));
      if (next.timeS < effectiveDomain.startS || next.timeS > effectiveDomain.endS) {
        const full = getFullTimeDomain(record);
        const span = effectiveDomain.endS - effectiveDomain.startS;
        const nextStart = clamp(
          next.timeS - span / 2,
          full.startS,
          full.endS - span,
        );
        setViewDomain({ startS: nextStart, endS: nextStart + span });
      }
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const cursor = keyboardCursorExtremum ?? getInitialKeyboardExtremum();
    if (!cursor) {
      setKeyboardAnnouncement(copy.selectionTooShort);
      return;
    }
    setKeyboardCursorSampleIndex(cursor.sampleIndex);
    if (!keyboardAnchorExtremum) {
      setKeyboardAnchorSampleIndex(cursor.sampleIndex);
      setKeyboardAnnouncement(`${copy.leftEndpoint} ${describeKeyboardExtremum(cursor)}`);
      return;
    }
    if (keyboardAnchorExtremum.sampleIndex === cursor.sampleIndex) {
      setKeyboardAnnouncement(copy.selectionTooShort);
      return;
    }
    const rangeStartTimeS = Math.min(keyboardAnchorExtremum.timeS, cursor.timeS);
    const rangeEndTimeS = Math.max(keyboardAnchorExtremum.timeS, cursor.timeS);
    const preview = createPistonOscillationPeriodSelection(
      record,
      rangeStartTimeS,
      rangeEndTimeS,
      PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
      Date.now(),
    );
    dispatch({
      type: 'selectPeriodRange',
      runIndex,
      rangeStartTimeS,
      rangeEndTimeS,
    });
    setKeyboardAnnouncement(preview.issue === null
      ? copy.selectionAccepted(preview.extrema.length, formatPeriodCount(preview.periodCount))
      : preview.issue === 'below-guided-minimum'
        ? copy.guidedMinimumWarning(PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT)
        : copy.selectionTooShort);
    setChartMode('pan');
    resetKeyboardSelection();
    if (preview.issue !== null) {
      window.setTimeout(() => onInvalidSelection?.(), 0);
    }
  };

  return (
    <main
      ref={processingPanelRef}
      className={`piston-processing-panel ${reviewMode ? 'is-review-mode' : ''}`}
      data-piston-data-processing-status={processing.status}
      data-piston-processing-run-index={runIndex}
      data-piston-processing-review={reviewMode || undefined}
    >
      <div className="piston-processing-run-list" role="group" aria-label={copy.runListAria}>
        {processing.runs.map((candidate, index) => {
          const state = getRunState(candidate, runIndex, index);
          return (
            <button
              type="button"
              key={candidate.rawMeasurementRecordId}
              className={`is-${state} ${reviewMode && index === runIndex ? 'is-viewing' : ''}`}
              disabled={!reviewMode && index !== runIndex}
              aria-current={index === runIndex ? 'step' : undefined}
              onClick={reviewMode ? () => setReviewRunIndex(index) : undefined}
            >
              <span>{copy.runLabel(index + 1)}</span>
              <strong>{candidate.targetHeightMm} mm</strong>
              <small>{copy.runState[state]}</small>
            </button>
          );
        })}
      </div>

      <section className="piston-processing-selection-section">
        <div className="piston-processing-section-heading">
          <div>
            <strong>{reviewMode ? copy.reviewTitle : copy.selectionTitle}</strong>
            <span>
              {reviewMode
                ? copy.reviewInstruction
                : copy.selectionInstruction(PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT)}
            </span>
          </div>
          <div className="piston-processing-view-tools">
            <span>{copy.wheelHint}</span>
          </div>
        </div>

        <div
          className={`piston-period-chart-wrap ${
            chartPulse ? 'is-guide-pulsing' : ''
          }`}
          data-piston-guide-target="period-chart"
          data-selection-issue={selection?.issue ?? 'none'}
          data-chart-mode={reviewMode ? 'pan-readonly' : chartMode}
        >
          <div
            ref={chartViewportRef}
            className="piston-period-chart-viewport"
            style={{ aspectRatio: `${chartWidth} / ${CHART_HEIGHT}` }}
          >
            <p id={`${chartId}-keyboard-help`} className="piston-processing-sr-only">
              {copy.chartKeyboardInstructions}
            </p>
            <svg
              ref={chartSvgRef}
              viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
              role="group"
              aria-label={copy.chartAria(runIndex + 1, run.targetHeightMm)}
              aria-describedby={`${chartId}-keyboard-help`}
              tabIndex={0}
              className={`is-${chartDrag?.type === 'pan' ? 'grabbing' : chartMode}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerInteraction}
              onPointerCancel={() => setChartDrag(null)}
              onKeyDown={handleChartKeyDown}
            >
              <defs>
                <clipPath id={`${chartId}-plot-clip`}>
                  <rect
                    x={CHART_LEFT}
                    y={CHART_TOP}
                    width={plotWidth}
                    height={plotHeight}
                  />
                </clipPath>
              </defs>
              <rect
                className="piston-period-chart-background"
                x={CHART_LEFT}
                y={CHART_TOP}
                width={plotWidth}
                height={plotHeight}
              />
              <g clipPath={`url(#${chartId}-plot-clip)`}>
                {selectionVisible && selectionLeftX !== null && selectionRightX !== null ? (
                  <>
                    <rect
                      className="piston-period-selection-outside"
                      x={CHART_LEFT}
                      y={CHART_TOP}
                      width={Math.max(0, selectionLeftX - CHART_LEFT)}
                      height={plotHeight}
                    />
                    <rect
                      className="piston-period-selection-outside"
                      x={selectionRightX}
                      y={CHART_TOP}
                      width={Math.max(0, graphRight - selectionRightX)}
                      height={plotHeight}
                    />
                    <rect
                      className="piston-period-selection-band"
                      x={selectionLeftX}
                      y={CHART_TOP}
                      width={Math.max(1, selectionRightX - selectionLeftX)}
                      height={plotHeight}
                    />
                  </>
                ) : null}
                {timeTicks.map((tick) => {
                  const x = CHART_LEFT + tick.ratio * plotWidth;
                  return (
                    <line
                      key={`time-grid-${tick.ratio}`}
                      className="piston-period-grid-line"
                      x1={x}
                      x2={x}
                      y1={CHART_TOP}
                      y2={CHART_BOTTOM}
                    />
                  );
                })}
                {pressureTicks.map((tick) => {
                  const y = CHART_BOTTOM - tick.ratio * plotHeight;
                  return (
                    <line
                      key={`pressure-grid-${tick.ratio}`}
                      className="piston-period-grid-line"
                      x1={CHART_LEFT}
                      x2={graphRight}
                      y1={y}
                      y2={y}
                    />
                  );
                })}
                {pressurePath ? <path className="piston-period-pressure-path" d={pressurePath} /> : null}
                {sampleMarkerPath ? (
                  <path
                    aria-hidden="true"
                    className={`piston-period-sample-markers is-${sampleDensity}`}
                    d={sampleMarkerPath}
                  />
                ) : null}
                {selectionVisible ? selection.extrema.map((extremum) => {
                  const endpoint = extremum.sampleIndex === selection.leftEndpoint?.sampleIndex
                    || extremum.sampleIndex === selection.rightEndpoint?.sampleIndex;
                  return (
                    <circle
                      key={`${extremum.type}-${extremum.sampleIndex}`}
                      className={`piston-period-extremum-ring ${endpoint ? 'is-endpoint' : ''}`}
                      cx={timeToX(extremum.timeS)}
                      cy={pressureToY(extremum.absolutePressureKpa)}
                      r={endpoint ? 5.8 : 4.5}
                    />
                  );
                }) : null}
                {chartMode === 'selection' && keyboardAnchorExtremum ? (
                  <circle
                    aria-hidden="true"
                    className="piston-period-keyboard-extremum is-anchor"
                    cx={timeToX(keyboardAnchorExtremum.timeS)}
                    cy={pressureToY(keyboardAnchorExtremum.absolutePressureKpa)}
                    r={6.5}
                  />
                ) : null}
                {chartMode === 'selection' && keyboardCursorExtremum ? (
                  <circle
                    aria-hidden="true"
                    className="piston-period-keyboard-extremum is-cursor"
                    cx={timeToX(keyboardCursorExtremum.timeS)}
                    cy={pressureToY(keyboardCursorExtremum.absolutePressureKpa)}
                    r={5}
                  />
                ) : null}
                {dragLeftX !== null && dragRightX !== null ? (
                  <rect
                    className="piston-period-drag-rectangle"
                    x={dragLeftX}
                    y={CHART_TOP}
                    width={Math.max(1, dragRightX - dragLeftX)}
                    height={plotHeight}
                  />
                ) : null}
              </g>
              <rect
                className="piston-period-plot-frame"
                x={CHART_LEFT}
                y={CHART_TOP}
                width={plotWidth}
                height={plotHeight}
              />
              {timeTicks.map((tick) => {
                const x = CHART_LEFT + tick.ratio * plotWidth;
                return (
                  <g key={`time-tick-${tick.ratio}`}>
                    <line
                      className="piston-period-inward-tick"
                      x1={x}
                      x2={x}
                      y1={CHART_BOTTOM}
                      y2={CHART_BOTTOM - 7}
                    />
                    <text className="piston-period-tick-label" x={x} y={CHART_BOTTOM + 20} textAnchor="middle">
                      {tick.value.toFixed(3)}
                    </text>
                  </g>
                );
              })}
              {pressureTicks.map((tick) => {
                const y = CHART_BOTTOM - tick.ratio * plotHeight;
                return (
                  <g key={`pressure-tick-${tick.ratio}`}>
                    <line
                      className="piston-period-inward-tick"
                      x1={CHART_LEFT}
                      x2={CHART_LEFT + 7}
                      y1={y}
                      y2={y}
                    />
                    <text className="piston-period-tick-label" x={CHART_LEFT - 10} y={y + 4} textAnchor="end">
                      {tick.value.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text
                className="piston-period-axis-label"
                x={18}
                y={(CHART_TOP + CHART_BOTTOM) / 2}
                transform={`rotate(-90 18 ${(CHART_TOP + CHART_BOTTOM) / 2})`}
                textAnchor="middle"
              >
                {copy.pressureAxis}
              </text>
              {selectionInfoPlacement && selection?.leftEndpoint && selection.rightEndpoint ? (
                <foreignObject
                  x={selectionInfoPlacement.x}
                  y={selectionInfoPlacement.y}
                  width={selectionInfoPlacement.width}
                  height={selectionInfoPlacement.height}
                  className="piston-period-selection-info-object"
                >
                  <div
                    className="piston-period-selection-info"
                    data-placement={selectionInfoPlacement.mode}
                  >
                    <span>
                      <em>{copy.leftEndpoint}</em>
                      <strong>({formatPistonOscillationEndpointTime(selection.leftEndpoint.timeS)}, {formatPistonOscillationObservedPressureKpa(selection.leftEndpoint.absolutePressureKpa)})</strong>
                    </span>
                    <span>
                      <em>{copy.rightEndpoint}</em>
                      <strong>({formatPistonOscillationEndpointTime(selection.rightEndpoint.timeS)}, {formatPistonOscillationObservedPressureKpa(selection.rightEndpoint.absolutePressureKpa)})</strong>
                    </span>
                    <span>
                      <em>{copy.periodCount}</em>
                      <strong>{formatPeriodCount(selection.periodCount)}</strong>
                    </span>
                  </div>
                </foreignObject>
              ) : null}
              <rect
                className="piston-period-interaction-surface"
                x={CHART_LEFT}
                y={CHART_TOP}
                width={plotWidth}
                height={plotHeight}
              />
            </svg>
            <div className="piston-processing-sr-only" role="status" aria-live="polite">
              {keyboardAnnouncement}
            </div>
          </div>
          <div
            ref={chartHorizontalScrollRef}
            className="piston-period-horizontal-scrollbar"
            data-piston-chart-horizontal-scrollbar="true"
            role="scrollbar"
            aria-label={copy.horizontalScrollbar}
            aria-orientation="horizontal"
            aria-valuemin={fullTimeDomain.startS}
            aria-valuemax={fullTimeDomain.startS + horizontalScrollRangeS}
            aria-valuenow={effectiveDomain.startS}
            aria-valuetext={`${effectiveDomain.startS.toFixed(3)}–${effectiveDomain.endS.toFixed(3)} s`}
            aria-disabled={horizontalScrollRangeS <= 0}
            tabIndex={0}
            title={copy.horizontalScrollbar}
            style={{
              marginLeft: `${CHART_LEFT / chartWidth * 100}%`,
              marginRight: `${CHART_RIGHT_MARGIN / chartWidth * 100}%`,
            }}
            onScroll={handleHorizontalScrollbarScroll}
          >
            <div
              className="piston-period-horizontal-scrollbar-content"
              style={{ width: `${horizontalScrollContentScale * 100}%` }}
            />
          </div>
          <div className="piston-period-chart-footer">
            <div
              className="piston-acquisition-actions piston-processing-chart-actions"
              role="group"
              aria-label={copy.selectionTitle}
            >
              <button
                type="button"
                className={`is-primary ${chartMode === 'selection' ? 'is-active' : ''} ${
                  selectionToolPulse ? 'is-guide-pulsing' : ''
                }`}
                data-piston-guide-target="period-tool"
                disabled={reviewMode || !canSelect}
                aria-pressed={chartMode === 'selection'}
                aria-label={chartMode === 'selection' ? copy.selectTool : copy.moveTool}
                title={chartMode === 'selection' ? copy.selectTool : copy.moveTool}
                onClick={() => {
                  onInteractionStart?.();
                  setChartDrag(null);
                  const enteringSelection = chartMode === 'pan';
                  setChartMode((current) => {
                    const next = current === 'pan' ? 'selection' : 'pan';
                    if (next === 'selection') {
                      setKeyboardCursorSampleIndex(getInitialKeyboardExtremum()?.sampleIndex ?? null);
                      setKeyboardAnchorSampleIndex(null);
                    } else {
                      resetKeyboardSelection();
                    }
                    return next;
                  });
                  if (enteringSelection) {
                    window.requestAnimationFrame(() => chartSvgRef.current?.focus());
                  }
                }}
              >
                <span className="piston-acquisition-action-feedback" aria-hidden="true">
                  {chartMode === 'selection'
                    ? <Crosshair size={14} strokeWidth={2.3} />
                    : <Hand size={14} strokeWidth={2.3} />}
                </span>
              </button>
              <button
                type="button"
                disabled={!canSelect || selection === null}
                aria-label={copy.clearSelection}
                title={copy.clearSelection}
                onClick={() => {
                  onInteractionStart?.();
                  setChartMode('pan');
                  setChartDrag(null);
                  resetKeyboardSelection();
                  dispatch({ type: 'clearPeriodSelection', runIndex });
                }}
              >
                <span className="piston-acquisition-action-feedback" aria-hidden="true">
                  <Eraser size={14} strokeWidth={2.3} />
                </span>
              </button>
              <button
                type="button"
                disabled={viewIsDefault}
                aria-label={copy.resetView}
                title={copy.resetView}
                onClick={resetView}
              >
                <span className="piston-acquisition-action-feedback" aria-hidden="true">
                  <Focus size={14} strokeWidth={2.3} />
                </span>
              </button>
            </div>
            <span className="piston-period-axis-footer-label">{copy.timeAxis}</span>
          </div>
        </div>

        {selection?.issue ? (
          <div className="piston-period-selection-warning" role="alert" aria-live="assertive">
            <strong>
              {selection.issue === 'insufficient-extrema'
                ? copy.selectionTooShort
                : copy.guidedMinimumWarning(PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT)}
            </strong>
          </div>
        ) : (
          <div className="piston-period-selection-helper" aria-live="polite">
            {selectionAccepted
              ? copy.selectionAccepted(selection.extrema.length, formatPeriodCount(selection.periodCount))
              : copy.dragHint}
          </div>
        )}
      </section>

      <section className="piston-period-calculation-section">
        <div className="piston-processing-section-heading">
          <div>
            <strong>{copy.preprocessingTitle}</strong>
            <span>{copy.preprocessingInstruction}</span>
          </div>
          <span className="piston-period-height-chip">h = {run.targetHeightMm} mm</span>
        </div>

        {!selectionAccepted ? (
          <div className="piston-period-calculation-locked">
            <strong>{copy.calculationLockedTitle}</strong>
            <span>{copy.calculationLockedBody}</span>
          </div>
        ) : (
          <div className="piston-period-calculation-flow">
            <article
              className={`piston-period-calculation-step ${
                !endpointsResolved ? 'is-active' : 'is-resolved'
              } ${endpointPulse ? 'is-guide-pulsing' : ''}`}
              data-piston-guide-target="period-endpoints"
            >
              <header>
                <span>1</span>
                <div>
                  <strong>{copy.endpointCheckTitle}</strong>
                  <small>{copy.endpointCheckInstruction}</small>
                </div>
              </header>
              <div className="piston-period-endpoint-fields">
                <PistonOscillationPeriodAnswerField
                  field="t1"
                  answer={run.answers.t1}
                  label={copy.t1Label}
                  precision={copy.endpointPrecision}
                  unit="s"
                  language={language}
                  disabled={endpointsResolved}
                  pulse={endpointPulse}
                  onDraftChange={(value) => dispatch({
                    type: 'editPeriodAnswer', runIndex, field: 't1', value,
                  })}
                  onContinue={() => dispatch({
                    type: 'continuePeriodAnswer', runIndex, field: 't1',
                  })}
                  onReveal={() => dispatch({
                    type: 'revealPeriodAnswer', runIndex, field: 't1',
                  })}
                  onSubmit={() => dispatch({ type: 'submitPeriodEndpoints', runIndex })}
                />
                <PistonOscillationPeriodAnswerField
                  field="t2"
                  answer={run.answers.t2}
                  label={copy.t2Label}
                  precision={copy.endpointPrecision}
                  unit="s"
                  language={language}
                  disabled={endpointsResolved}
                  pulse={endpointPulse}
                  onDraftChange={(value) => dispatch({
                    type: 'editPeriodAnswer', runIndex, field: 't2', value,
                  })}
                  onContinue={() => dispatch({
                    type: 'continuePeriodAnswer', runIndex, field: 't2',
                  })}
                  onReveal={() => dispatch({
                    type: 'revealPeriodAnswer', runIndex, field: 't2',
                  })}
                  onSubmit={() => dispatch({ type: 'submitPeriodEndpoints', runIndex })}
                />
              </div>
              <button
                type="button"
                className="piston-period-step-confirm"
                disabled={endpointsResolved || endpointHasFeedback}
                onClick={() => dispatch({ type: 'submitPeriodEndpoints', runIndex })}
              >
                <Check size={14} aria-hidden="true" />
                {copy.checkEndpoints}
              </button>
            </article>

            <article
              className={`piston-period-calculation-step ${
                endpointsResolved && !run.result ? 'is-active' : ''
              } ${run.result ? 'is-resolved' : ''} ${periodPulse ? 'is-guide-pulsing' : ''}`}
              data-piston-guide-target="period-answer"
            >
              <header>
                <span>2</span>
                <div>
                  <strong>{copy.periodCheckTitle}</strong>
                  <small>{copy.periodCheckInstruction}</small>
                </div>
              </header>
              {endpointsResolved && run.answers.period.expectedValue !== null ? (
                <div className="piston-period-formula-row">
                  <div className="piston-period-formula">
                    <strong>T = (t₂ − t₁) / N</strong>
                    <span>
                      = ({formatPistonOscillationEndpointTime(run.answers.t2.expectedValue!)} − {formatPistonOscillationEndpointTime(run.answers.t1.expectedValue!)}) / {formatPeriodCount(selection.periodCount)}
                    </span>
                  </div>
                  <PistonOscillationPeriodAnswerField
                    field="period"
                    answer={run.answers.period}
                    label={copy.periodLabel}
                    precision={copy.periodPrecision}
                    unit="s"
                    language={language}
                    disabled={!endpointsResolved}
                    pulse={periodPulse}
                    inputRef={periodInputRef}
                    onDraftChange={(value) => dispatch({
                      type: 'editPeriodAnswer', runIndex, field: 'period', value,
                    })}
                    onContinue={() => dispatch({
                      type: 'continuePeriodAnswer', runIndex, field: 'period',
                    })}
                    onReveal={() => dispatch({
                      type: 'revealPeriodAnswer', runIndex, field: 'period',
                    })}
                    onSubmit={() => dispatch({ type: 'submitPeriod', runIndex })}
                  />
                  <button
                    type="button"
                    className="piston-period-step-confirm"
                    disabled={run.result !== null || run.answers.period.feedback !== null}
                    onClick={() => dispatch({ type: 'submitPeriod', runIndex })}
                  >
                    <Check size={14} aria-hidden="true" />
                    {copy.checkPeriod}
                  </button>
                </div>
              ) : (
                <div className="piston-period-step-waiting">{copy.periodWaiting}</div>
              )}
            </article>
          </div>
        )}

        {run.result ? (
          <>
            <div className="piston-period-result-strip" aria-live="polite">
              <span><em>Δt</em><strong>{run.result.deltaTimeS.toFixed(3)} s</strong></span>
              <span><em>N</em><strong>{formatPeriodCount(run.result.periodCount)}</strong></span>
              <span><em>T</em><strong>{formatPistonOscillationPeriod(run.result.periodS)} s</strong></span>
              <span><em>T²</em><strong>{formatSignificantFiguresHalfEven(run.result.periodSquaredS2, 5)} s²</strong></span>
            </div>
            {reviewMode ? (
              <div className="piston-period-review-audit" role="note">
                {copy.reviewAttemptSummary(endpointSubmissionCount, periodSubmissionCount)}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {reviewMode ? (
        <footer className="piston-processing-navigation is-review-navigation">
          <button type="button" className="is-secondary" onClick={onCloseReview}>
            <ChevronLeft size={15} aria-hidden="true" />
            {copy.closeReview}
          </button>
          <div aria-live="polite">
            <strong>{copy.reviewRunSummary(runIndex + 1, processing.runs.length)}</strong>
          </div>
          <button
            type="button"
            className="is-primary"
            onClick={onOpenCalculationReview}
          >
            {copy.viewFitAndCalculation}
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </footer>
      ) : (
        <footer className="piston-processing-navigation">
          <button type="button" className="is-secondary" disabled aria-disabled="true">
            <ChevronLeft size={15} aria-hidden="true" />
            {copy.previousRun}
          </button>
          <div aria-live="polite">
            {calculationReady
              ? <strong>{copy.calculationReady}</strong>
              : run.result
                ? <span>{copy.navigationUnlocked}</span>
                : <span>{copy.navigationLocked}</span>}
          </div>
          <button
            ref={nextRunButtonRef}
            type="button"
            className={`is-primary ${nextPulse ? 'is-guide-pulsing' : ''}`}
            data-piston-guide-target="period-next"
            disabled={!run.result || calculationReady}
            aria-disabled={!run.result || calculationReady}
            onClick={() => {
              onInteractionStart?.();
              dispatch({ type: 'advancePeriodRun' });
            }}
          >
            {isLastRun ? copy.nextStep : copy.nextRun}
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </footer>
      )}
      {calculationReady ? (
        <div className="piston-processing-ready-banner" role="status">
          <Check size={18} aria-hidden="true" />
          <div>
            <strong>{copy.calculationReady}</strong>
            <span>{copy.calculationReadyDetail}</span>
          </div>
        </div>
      ) : null}
      <span className="piston-processing-extrema-count" aria-hidden="true">
        {allExtrema.length}
      </span>
    </main>
  );
};

export default PistonOscillationDataProcessingPanel;
