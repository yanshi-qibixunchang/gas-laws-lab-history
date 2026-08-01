import { Mouse, MousePointer2, PanelTopOpen, X } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  calculateHeatCapacityGroupReference,
} from '../../domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
  getHeatCapacityCalculationWorkflowField,
  submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft,
  type HeatCapacityCalculationWorkflowSession,
} from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../domain/heatCapacity/heatCapacityCalculationValidation.ts';
import HeatCapacityCalculationWindow from '../heatCapacity/HeatCapacityCalculationWindow.tsx';
import HeatCapacityExperimentGroupContextBar from '../heatCapacity/HeatCapacityExperimentGroupContextBar.tsx';
import HeatCapacityGroupResultsPanel from '../heatCapacity/HeatCapacityGroupResultsPanel.tsx';
import HeatCapacityProcessReviewPanel from '../heatCapacity/HeatCapacityProcessReviewPanel.tsx';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import {
  createProductIntroOutcomeGroupFixture,
  createProductIntroOutcomeReview,
} from './productIntroOutcomeFixture.ts';
import {
  PRODUCT_INTRO_OUTCOME_DURATION_MS,
  PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_END_MS,
  PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS,
  PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS,
  PRODUCT_INTRO_OUTCOME_REPORT_RETURN_START_MS,
  PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_END_MS,
  PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_START_MS,
  PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS,
  PRODUCT_INTRO_OUTCOME_TRANSITION_START_MS,
} from './productIntroOutcomeTimeline.ts';
import './ProductIntroOutcomeDemo.css';

export { PRODUCT_INTRO_OUTCOME_DURATION_MS } from './productIntroOutcomeTimeline.ts';

const FIRST_INPUT_START_MS = 430;
const FIRST_INPUT_SETTLE_END_MS = 1_050;
const SECOND_INPUT_CURSOR_ARRIVAL_MS = 1_250;
const SECOND_INPUT_START_MS = 1_280;
const SECOND_INPUT_SETTLE_END_MS = 1_750;
const CONFIRM_CURSOR_ARRIVAL_MS = 2_050;
const CALCULATION_SUBMIT_MS = 2_100;
const REPORT_DETAILS_EXPANDED_HEIGHT_PX = 270;

interface Point {
  x: number;
  y: number;
}

interface ProductIntroOutcomeDemoProps {
  controlledElapsedMs?: number;
  language?: WorkbenchLanguagePreference;
  active?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
  onComplete?: () => void;
}

interface ProductIntroOutcomeDemoCopy {
  resultsTitle: string;
  resultsSubtitle: string;
  closeResults: string;
  resultsTabs: string;
  processReview: string;
}

const productIntroOutcomeDemoCopies: Record<WorkbenchLanguagePreference, ProductIntroOutcomeDemoCopy> = {
  'zh-CN': {
    resultsTitle: '实验资料与结果',
    resultsSubtitle: '完整过程、计算结果与本组总分',
    closeResults: '关闭实验资料与结果',
    resultsTabs: '实验资料与结果标签页',
    processReview: '过程回顾',
  },
  'zh-TW': {
    resultsTitle: '實驗資料與結果',
    resultsSubtitle: '完整過程、計算結果與本組總分',
    closeResults: '關閉實驗資料與結果',
    resultsTabs: '實驗資料與結果分頁',
    processReview: '過程回顧',
  },
  en: {
    resultsTitle: 'Experiment Materials & Results',
    resultsSubtitle: 'Complete process, calculations, and group score',
    closeResults: 'Close Experiment Materials & Results',
    resultsTabs: 'Experiment Materials & Results tabs',
    processReview: 'Process Review',
  },
};

const reference = calculateHeatCapacityGroupReference({
  u0Mv: 0.1,
  u1Mv: 120.1,
  u2Mv: 40.1,
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
});

if (reference === null) {
  throw new Error('Product introduction calculation reference is invalid.');
}

const baseCalculationSession = createHeatCapacityCalculationWorkflowSession({
  mode: 'guide',
  groups: [{ trialId: 'product-intro-calculation', reference }],
  theoreticalGamma: 1.4,
  now: 0,
});

const calculationStep = baseCalculationSession.groups[0].steps[0];
const [correctFieldId, incorrectFieldId] = calculationStep.fieldIds;
const correctField = getHeatCapacityCalculationWorkflowField(
  baseCalculationSession,
  correctFieldId,
);

if (correctField === null) {
  throw new Error('Product introduction calculation field is unavailable.');
}

const CORRECT_VALUE = formatHeatCapacityCalculationReference(
  correctField.expectedValue,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS.correctedVoltage,
);
const INCORRECT_VALUE = '92.0';
const OUTCOME_REVIEW = createProductIntroOutcomeReview();
const OUTCOME_GROUP_FIXTURE = createProductIntroOutcomeGroupFixture();

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeInOut = (value: number) => {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
};
const easeCursorMotion = (value: number) => {
  const progress = clamp01(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
};
const mix = (from: number, to: number, progress: number) => (
  from + (to - from) * easeCursorMotion(progress)
);
const mixPoint = (from: Point, to: Point, progress: number): Point => ({
  x: mix(from.x, to.x, progress),
  y: mix(from.y, to.y, progress),
});

const typedValueAt = (
  value: string,
  elapsedMs: number,
  startMs: number,
  characterIntervalMs: number,
) => {
  if (elapsedMs < startMs) return '';
  const characterCount = Math.min(
    value.length,
    Math.floor((elapsedMs - startMs) / characterIntervalMs) + 1,
  );
  return value.slice(0, characterCount);
};

const createCalculationSessionAt = (
  elapsedMs: number,
): HeatCapacityCalculationWorkflowSession => {
  const firstDraft = elapsedMs >= CALCULATION_SUBMIT_MS
    ? CORRECT_VALUE
    : typedValueAt(CORRECT_VALUE, elapsedMs, FIRST_INPUT_START_MS, 105);
  const secondDraft = elapsedMs >= CALCULATION_SUBMIT_MS
    ? INCORRECT_VALUE
    : typedValueAt(INCORRECT_VALUE, elapsedMs, SECOND_INPUT_START_MS, 105);
  let session = baseCalculationSession;
  if (firstDraft) {
    session = updateHeatCapacityCalculationDraft(session, correctFieldId, firstDraft);
  }
  if (secondDraft) {
    session = updateHeatCapacityCalculationDraft(session, incorrectFieldId, secondDraft);
  }
  if (elapsedMs >= CALCULATION_SUBMIT_MS) {
    session = submitHeatCapacityCalculationStep(session, calculationStep.id, elapsedMs);
  }
  return session;
};

const getCursorPoint = (
  elapsedMs: number,
  targetPoints: Record<string, Point>,
): Point => {
  const first = targetPoints.first ?? { x: 475, y: 315 };
  const second = targetPoints.second ?? { x: 785, y: 315 };
  const confirm = targetPoints.confirm ?? { x: 1_095, y: 315 };
  const reportScroll = targetPoints.reportScroll ?? { x: 1_275, y: 220 };
  const reportExpand = targetPoints.reportExpand ?? { x: 25, y: 410 };
  const start = { x: first.x + 150, y: first.y - 105 };

  if (elapsedMs < 350) return mixPoint(start, first, elapsedMs / 350);
  if (elapsedMs < FIRST_INPUT_SETTLE_END_MS) return first;
  if (elapsedMs < SECOND_INPUT_CURSOR_ARRIVAL_MS) {
    return mixPoint(
      first,
      second,
      (elapsedMs - FIRST_INPUT_SETTLE_END_MS) /
        (SECOND_INPUT_CURSOR_ARRIVAL_MS - FIRST_INPUT_SETTLE_END_MS),
    );
  }
  if (elapsedMs < SECOND_INPUT_SETTLE_END_MS) return second;
  if (elapsedMs < CONFIRM_CURSOR_ARRIVAL_MS) {
    return mixPoint(
      second,
      confirm,
      (elapsedMs - SECOND_INPUT_SETTLE_END_MS) /
        (CONFIRM_CURSOR_ARRIVAL_MS - SECOND_INPUT_SETTLE_END_MS),
    );
  }
  if (elapsedMs < PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS) return confirm;
  if (elapsedMs < PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_START_MS) return reportScroll;
  if (elapsedMs < PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS) return reportScroll;
  if (elapsedMs < PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS) {
    return mixPoint(
      reportScroll,
      reportExpand,
      (elapsedMs - PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS) /
        (PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS - PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS),
    );
  }
  return reportExpand;
};

const isCursorClicking = (elapsedMs: number) => (
  (elapsedMs >= 330 && elapsedMs <= 520) ||
  (elapsedMs >= 1_230 && elapsedMs <= 1_420) ||
  (elapsedMs >= 2_030 && elapsedMs <= 2_250) ||
  (
    elapsedMs >= PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS &&
    elapsedMs <= PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS + 210
  )
);

export const ProductIntroOutcomeDemo = ({
  controlledElapsedMs,
  language = 'zh-CN',
  active = true,
  paused = false,
  reducedMotion = false,
  onComplete,
}: ProductIntroOutcomeDemoProps) => {
  const controlled = typeof controlledElapsedMs === 'number';
  const [playbackElapsedMs, setPlaybackElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const activeRef = useRef(false);
  const completionNotifiedRef = useRef(false);
  const copy = productIntroOutcomeDemoCopies[language];
  const elapsedMs = reducedMotion
    ? PRODUCT_INTRO_OUTCOME_DURATION_MS
    : Math.max(0, controlled ? controlledElapsedMs : playbackElapsedMs);
  const reportActive = elapsedMs >= PRODUCT_INTRO_OUTCOME_TRANSITION_START_MS;
  const calculationActive = elapsedMs < PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS;
  const reportExpanded = elapsedMs >= PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS;
  const calculationSession = useMemo(
    () => createCalculationSessionAt(elapsedMs),
    [elapsedMs],
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reportScrollRef = useRef<HTMLDivElement | null>(null);
  const [targetPoints, setTargetPoints] = useState<Record<string, Point>>({});

  useEffect(() => {
    if (controlled) return;
    const entering = active && !activeRef.current;
    activeRef.current = active;
    if (!entering) return;
    elapsedRef.current = 0;
    completionNotifiedRef.current = false;
    setPlaybackElapsedMs(0);
  }, [active, controlled]);

  useEffect(() => {
    if (controlled || !active || paused || reducedMotion) return undefined;
    let frameId = 0;
    let previousTimestamp = performance.now();
    const advance = (timestamp: number) => {
      const deltaMs = Math.max(0, timestamp - previousTimestamp);
      previousTimestamp = timestamp;
      const nextElapsedMs = Math.min(
        PRODUCT_INTRO_OUTCOME_DURATION_MS,
        elapsedRef.current + deltaMs,
      );
      elapsedRef.current = nextElapsedMs;
      setPlaybackElapsedMs(nextElapsedMs);
      if (nextElapsedMs >= PRODUCT_INTRO_OUTCOME_DURATION_MS) {
        if (!completionNotifiedRef.current) {
          completionNotifiedRef.current = true;
          onComplete?.();
        }
        return;
      }
      frameId = window.requestAnimationFrame(advance);
    };
    frameId = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frameId);
  }, [active, controlled, onComplete, paused, reducedMotion]);

  const reportScrollProgress = easeInOut(
    (elapsedMs - PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_START_MS) /
    (PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_END_MS - PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_START_MS),
  );
  const reportReturnProgress = easeInOut(
    (elapsedMs - PRODUCT_INTRO_OUTCOME_REPORT_RETURN_START_MS) /
    (PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS - PRODUCT_INTRO_OUTCOME_REPORT_RETURN_START_MS),
  );
  const reportExpandProgress = easeInOut(
    (elapsedMs - PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS) /
    (PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_END_MS - PRODUCT_INTRO_OUTCOME_REPORT_EXPAND_START_MS),
  );
  const sceneTransitionProgress = easeInOut(
    (elapsedMs - PRODUCT_INTRO_OUTCOME_TRANSITION_START_MS) /
    (PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS - PRODUCT_INTRO_OUTCOME_TRANSITION_START_MS),
  );
  const reviewCursorFadeProgress = easeInOut(
    (elapsedMs - PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS) / 200,
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const getCenter = (selector: string): Point | null => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - rootRect.left + rect.width / 2,
        y: rect.top - rootRect.top + rect.height / 2,
      };
    };
    const nextPoints: Record<string, Point> = {};
    const first = getCenter(`[data-heat-capacity-calculation-field="${correctFieldId}"] input`);
    const second = getCenter(`[data-heat-capacity-calculation-field="${incorrectFieldId}"] input`);
    const confirm = getCenter('.studio-heat-calculation-step-active .studio-heat-calculation-step-confirm');
    const reportExpand = getCenter('[data-hpr-diagnosis-expand="calculation"]');
    if (first) nextPoints.first = first;
    if (second) nextPoints.second = second;
    if (confirm) nextPoints.confirm = confirm;
    if (reportExpand) nextPoints.reportExpand = reportExpand;
    nextPoints.reportScroll = { x: rootRect.width - 34, y: rootRect.height * 0.42 };
    setTargetPoints((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextPoints);
      const unchanged = currentKeys.length === nextKeys.length && nextKeys.every((key) => (
        Math.abs((current[key]?.x ?? 0) - nextPoints[key].x) < 0.5 &&
        Math.abs((current[key]?.y ?? 0) - nextPoints[key].y) < 0.5
      ));
      return unchanged ? current : nextPoints;
    });
  }, [
    calculationSession,
    reportActive,
    reportExpanded,
    reportReturnProgress,
    reportScrollProgress,
  ]);

  useLayoutEffect(() => {
    if (reportActive) return;
    const focusSelector = elapsedMs < FIRST_INPUT_SETTLE_END_MS
      ? `[data-heat-capacity-calculation-field="${correctFieldId}"] input`
      : elapsedMs < SECOND_INPUT_SETTLE_END_MS
        ? `[data-heat-capacity-calculation-field="${incorrectFieldId}"] input`
        : null;
    if (focusSelector) {
      document.querySelector<HTMLInputElement>(focusSelector)?.focus({ preventScroll: true });
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [elapsedMs, reportActive]);

  useLayoutEffect(() => {
    if (!reportActive) return;
    const scrollNode = reportScrollRef.current;
    if (!scrollNode) return;
    const updateScroll = () => {
      const maximum = Math.max(0, scrollNode.scrollHeight - scrollNode.clientHeight);
      const expandButton = scrollNode.querySelector<HTMLElement>(
        '[data-hpr-diagnosis-expand="calculation"]',
      );
      if (!expandButton) {
        scrollNode.scrollTop = maximum * reportScrollProgress;
        return;
      }
      const scrollRect = scrollNode.getBoundingClientRect();
      const buttonRect = expandButton.getBoundingClientRect();
      const buttonContentTop = scrollNode.scrollTop + buttonRect.top - scrollRect.top;
      const calculationTarget = Math.max(0, Math.min(maximum, buttonContentTop - 92));
      if (reportExpanded || elapsedMs >= PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS) {
        scrollNode.scrollTop = calculationTarget;
        return;
      }
      if (elapsedMs < PRODUCT_INTRO_OUTCOME_REPORT_RETURN_START_MS) {
        scrollNode.scrollTop = maximum * reportScrollProgress;
        return;
      }
      scrollNode.scrollTop = maximum + (calculationTarget - maximum) * reportReturnProgress;
    };
    const frameId = window.requestAnimationFrame(updateScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    elapsedMs,
    reportActive,
    reportExpandProgress,
    reportExpanded,
    reportReturnProgress,
    reportScrollProgress,
  ]);

  useLayoutEffect(() => {
    if (!reportActive) return;
    const button = reportScrollRef.current?.querySelector<HTMLButtonElement>(
      '[data-hpr-diagnosis-expand="calculation"]',
    );
    if (!button) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (expanded !== reportExpanded) button.click();
  }, [reportActive, reportExpanded]);

  const cursorPoint = getCursorPoint(elapsedMs, targetPoints);
  const cursorStyle = {
    left: `${cursorPoint.x}px`,
    top: `${cursorPoint.y}px`,
    opacity: elapsedMs < PRODUCT_INTRO_OUTCOME_TRANSITION_START_MS
      ? 1
      : elapsedMs < PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS
        ? 1 - sceneTransitionProgress
        : reviewCursorFadeProgress,
  } as CSSProperties;
  const calculationLayerStyle = {
    opacity: 1 - sceneTransitionProgress,
    transform: `translateY(${-6 * sceneTransitionProgress}px)`,
  } as CSSProperties;
  const reviewLayerStyle = {
    opacity: sceneTransitionProgress,
    transform: `translateY(${8 * (1 - sceneTransitionProgress)}px)`,
  } as CSSProperties;
  const demoStyle = {
    '--product-intro-outcome-recording-expand-height': `${REPORT_DETAILS_EXPANDED_HEIGHT_PX * reportExpandProgress}px`,
    '--product-intro-outcome-recording-expand-opacity': reportExpandProgress.toFixed(3),
  } as CSSProperties;
  const cursorScrolling = reportActive && (
    (
      elapsedMs >= PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_START_MS &&
      elapsedMs <= PRODUCT_INTRO_OUTCOME_REPORT_SCROLL_END_MS
    ) || (
      elapsedMs >= PRODUCT_INTRO_OUTCOME_REPORT_RETURN_START_MS &&
      elapsedMs <= PRODUCT_INTRO_OUTCOME_REPORT_RETURN_END_MS
    )
  );

  return (
    <div
      ref={rootRef}
      className="product-intro-outcome-demo studio-workbench studio-theme-light"
      style={demoStyle}
      data-product-intro-outcome-scene={
        elapsedMs < PRODUCT_INTRO_OUTCOME_TRANSITION_START_MS
          ? 'calculation'
          : elapsedMs < PRODUCT_INTRO_OUTCOME_TRANSITION_END_MS
            ? 'transition'
            : 'review'
      }
      data-product-intro-outcome-transition-progress={sceneTransitionProgress.toFixed(3)}
      data-product-intro-outcome-expanded={reportExpanded ? 'true' : 'false'}
    >
      {calculationActive ? (
        <div
          className="product-intro-outcome-scene-layer product-intro-outcome-calculation-layer"
          style={calculationLayerStyle}
          aria-hidden={reportActive}
        >
          <HeatCapacityCalculationWindow
            open
            language={language}
            session={calculationSession}
            onDraftChange={() => undefined}
            onSubmitStep={() => undefined}
            onContinueAnswer={() => undefined}
            onRevealAnswer={() => undefined}
            onSelectGroup={() => undefined}
            onSelectAggregate={() => undefined}
            onCompleteAndExit={() => undefined}
            onClose={() => undefined}
          />
        </div>
      ) : null}
      {reportActive ? (
        <section
          className="studio-dock-panel studio-optional-panel studio-results-window studio-heat-materials-window product-intro-outcome-review-window product-intro-outcome-scene-layer product-intro-outcome-review-layer"
          style={reviewLayerStyle}
          aria-label={copy.resultsTitle}
        >
          <div className="studio-results-window-resizer" aria-hidden="true" />
          <div className="studio-results-toolbar studio-heat-materials-toolbar">
            <div className="studio-results-title">
              <strong>{copy.resultsTitle}</strong>
              <span>{copy.resultsSubtitle}</span>
            </div>
            <div className="studio-results-actions">
              <button type="button" aria-label={copy.closeResults} tabIndex={-1}>
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="studio-results-tabs studio-heat-materials-tabs" role="tablist" aria-label={copy.resultsTabs}>
            <button type="button" role="tab" aria-selected="true" className="studio-results-tab-active" tabIndex={-1}>
              <PanelTopOpen size={13} />
              <span>{copy.processReview}</span>
              <span className="studio-results-tab-close" aria-hidden="true"><X size={12} /></span>
            </button>
          </div>
          <div
            ref={reportScrollRef}
            className="studio-results-body studio-heat-materials-body product-intro-outcome-review-scroll"
          >
            <div className="studio-heat-review-with-scheme">
              <HeatCapacityExperimentGroupContextBar
                collection={OUTCOME_GROUP_FIXTURE.collection}
                language={language}
                onViewedGroupChange={() => undefined}
                onViewedTrialChange={() => undefined}
              />
              <HeatCapacityProcessReviewPanel
                mode="free"
                review={OUTCOME_REVIEW}
                selectedTrialId={OUTCOME_REVIEW.selectedTrialId}
                language={language}
                onSelectedTrialChange={() => undefined}
              />
              <HeatCapacityGroupResultsPanel
                group={OUTCOME_GROUP_FIXTURE.group}
                collection={OUTCOME_GROUP_FIXTURE.collection}
                language={language}
              />
            </div>
          </div>
        </section>
      ) : null}

      <span
        className={`product-intro-outcome-cursor ${isCursorClicking(elapsedMs) ? 'is-clicking' : ''} ${cursorScrolling ? 'is-scrolling' : ''}`}
        style={cursorStyle}
        aria-hidden="true"
      >
        {cursorScrolling ? (
          <Mouse size={23} fill="var(--studio-surface-1)" strokeWidth={1.55} />
        ) : (
          <MousePointer2 size={22} fill="currentColor" strokeWidth={1.35} />
        )}
        <span className="product-intro-outcome-click-ring" />
      </span>
    </div>
  );
};
