import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Check, Play, RotateCcw, Square } from 'lucide-react';
import {
  createPistonOscillationLoadedEquilibriumState,
  simulatePistonOscillationRelease,
  type PistonOscillationTrajectory,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
  type PistonOscillationRawMeasurementRecord,
} from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  createInitialPistonOscillationDynamicSensorState,
  createPistonOscillationRecordedObservationSamples,
  createPistonOscillationDynamicSensorObservationSeries,
  createPistonOscillationSensorObservationSeries,
  findPistonOscillationObservedFallingTriggerSample,
  formatPistonOscillationObservedPressureKpa,
  getPistonOscillationObservedTimeS,
  quantizePistonOscillationObservedPressureKpa,
  type PistonOscillationObservedSample,
  type PistonOscillationSensorObservationSeries,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_ACQUISITION_BASELINE_PRESSURE_KPA,
  PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
  PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS,
} from './pistonOscillationAcquisitionConfig.ts';
import {
  getPistonOscillationDemoFrame,
  getPistonOscillationDemoTrajectory,
  type PistonOscillationDemoFrame,
} from './pistonOscillationDemoTimeline.ts';
import {
  PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT,
  type PistonOscillationDemoPlaybackChannel,
} from './pistonOscillationDemoPlaybackChannel.ts';
import type {
  PistonOscillationGuideAction,
  PistonOscillationGuideActionContext,
  PistonOscillationGuideGuardResult,
  PistonOscillationGuideParameterField,
  PistonOscillationGuideSavedMeasurement,
  PistonOscillationGuideSession,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type {
  PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  createLegacyUnknownPistonOscillationPressOperationEvidence,
  type PistonOscillationPressOperationEvidence,
} from '../../domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA,
  PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
  PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  getPistonOscillationShellCopy,
  type PistonOscillationLanguage,
} from './pistonOscillationCopy.ts';
import './PistonOscillationAcquisitionPanel.css';
import './PistonOscillationChartControls.css';
import type {
  PistonOscillationLivePressureObservation,
  PistonOscillationLivePressureChannel,
} from './pistonOscillationLivePressureChannel.ts';
import {
  createPistonOscillationContinuousObservationSeries,
  createPistonOscillationContinuousRecordingSamples,
  type PistonOscillationRecordingReleaseSegment,
} from './pistonOscillationContinuousRecordingModel.ts';
import {
  PISTON_OSCILLATION_FREE_SAMPLE_RATE_MAX_HZ,
  PISTON_OSCILLATION_FREE_SAMPLE_RATE_MIN_HZ,
  PISTON_OSCILLATION_FREE_TRIGGER_MAX_KPA,
  PISTON_OSCILLATION_FREE_TRIGGER_MIN_KPA,
  PISTON_OSCILLATION_MONITOR_GRAPH_MAX_KPA,
  PISTON_OSCILLATION_MONITOR_GRAPH_MIN_KPA,
  getPistonOscillationAdaptivePressureGraphDomain,
  parsePistonOscillationFreeSampleRate,
  parsePistonOscillationFreeTriggerThreshold,
  type PressureGraphDomain,
} from './pistonOscillationFreeAcquisitionModel.ts';

type AcquisitionPhase = 'idle' | 'armed' | 'recording' | 'stopped';
type FreeRecordingPath = 'falling-trigger' | 'immediate';

export type PistonOscillationGuideAcquisitionCue =
  | 'settings'
  | 'start'
  | 'pause'
  | 'redo'
  | 'save'
  | null;

export type PistonOscillationGuideAcquisitionEvent =
  | { type: 'startAcquisition' }
  | { type: 'restoreInterruptedAcquisition' }
  | {
      type: 'pressureAttemptRejected';
      reason: 'underpressure' | 'overpressure';
      peakPressureKpa: number;
    }
  | { type: 'pressureAttemptAccepted'; peakPressureKpa: number }
  | { type: 'redoOverpressureAttempt' }
  | { type: 'triggered' }
  | {
      type: 'recordingReady';
      candidate: PistonOscillationGuideSavedMeasurement;
    }
  | {
      type: 'curvePaused';
      candidate: PistonOscillationGuideSavedMeasurement;
    }
  | { type: 'saveMeasurement' };

export interface PistonOscillationReleaseEvent {
  id: number;
  startedAtMs: number;
  trajectory: PistonOscillationTrajectory;
  pressOperationEvidence: PistonOscillationPressOperationEvidence;
}

export interface PistonOscillationPressStartEvent {
  id: number;
  startedAtMs: number;
}

export interface PistonOscillationAcquisitionPanelHandle {
  pauseAndCaptureFreeRun: () => PistonOscillationRawMeasurementRecord | null;
}

export interface PistonOscillationAcquisitionPanelProps {
  language: PistonOscillationLanguage;
  powerOn: boolean;
  releaseEvent: PistonOscillationReleaseEvent | null;
  pressStartEvent?: PistonOscillationPressStartEvent | null;
  livePressureChannel?: PistonOscillationLivePressureChannel;
  demoFrame?: PistonOscillationDemoFrame;
  demoPlaybackChannel?: PistonOscillationDemoPlaybackChannel;
  demoPlaybackFileId?: string;
  guideSession?: PistonOscillationGuideSession;
  freeSession?: PistonOscillationFreeSession;
  guidePauseReady?: boolean;
  onGuideParameterEdit?: (
    field: PistonOscillationGuideParameterField,
    value: string,
  ) => void;
  onGuideParameterCommit?: (field: PistonOscillationGuideParameterField) => void;
  onFreeAcquisitionSettingCommit?: (
    field: 'sampleRateHz' | 'triggerThresholdKpa',
    value: number,
  ) => void;
  onFreeCandidateChange?: (candidate: PistonOscillationRawMeasurementRecord | null) => void;
  onFreeMeasurementSave?: (measurement: PistonOscillationRawMeasurementRecord) => void;
  guidePaused?: boolean;
  guideCue?: PistonOscillationGuideAcquisitionCue;
  onGuideAcquisitionEvent?: (event: PistonOscillationGuideAcquisitionEvent) => void;
  onGuideActionAttempt?: (
    action: PistonOscillationGuideAction,
    context: PistonOscillationGuideActionContext,
  ) => PistonOscillationGuideGuardResult;
  onRunRetained?: () => void;
}

const GRAPH_DEFAULT_WIDTH = 860;
const GRAPH_HEIGHT = 380;
const GRAPH_LEFT = 64;
const GRAPH_RIGHT_MARGIN = 24;
const GRAPH_TOP = 24;
const GRAPH_BOTTOM = 334;
const ACQUISITION_DISPLAY_FRAME_INTERVAL_MS = 1000 / 30;
const GRAPH_MIN_PRESSURE_KPA = 96;
const GRAPH_MAX_PRESSURE_KPA = 121;

const DEFAULT_PRESSURE_GRAPH_DOMAIN: PressureGraphDomain = {
  minimumKpa: GRAPH_MIN_PRESSURE_KPA,
  maximumKpa: GRAPH_MAX_PRESSURE_KPA,
  ticksKpa: [96, 102, 108, 114, 120],
};

const getGuidedPressureGraphDomain = (
  domain: PressureGraphDomain,
): PressureGraphDomain => {
  const minimumKpa = Math.min(
    domain.minimumKpa,
    PISTON_OSCILLATION_MONITOR_GRAPH_MIN_KPA,
  );
  const maximumKpa = Math.max(
    domain.maximumKpa,
    PISTON_OSCILLATION_MONITOR_GRAPH_MAX_KPA,
  );
  const tickStepKpa = (maximumKpa - minimumKpa) / 4;
  return {
    minimumKpa,
    maximumKpa,
    ticksKpa: Array.from(
      { length: 5 },
      (_, index) => minimumKpa + tickStepKpa * index,
    ),
  };
};

const subscribeToNoLivePressure = () => () => undefined;
const getNoLivePressure = () => null;
const subscribeToNoDemoPlayback = () => () => undefined;
const getNoDemoPlaybackSnapshot = () => PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT;

const getObservedPressureGraphDomain = (
  samples: readonly PistonOscillationObservedSample[],
): PressureGraphDomain => {
  let minimumKpa = Number.POSITIVE_INFINITY;
  let maximumKpa = Number.NEGATIVE_INFINITY;
  for (const sample of samples) {
    minimumKpa = Math.min(minimumKpa, sample.absolutePressureKpa);
    maximumKpa = Math.max(maximumKpa, sample.absolutePressureKpa);
  }
  if (!Number.isFinite(minimumKpa) || !Number.isFinite(maximumKpa)) {
    return DEFAULT_PRESSURE_GRAPH_DOMAIN;
  }
  const spanKpa = Math.max(1, maximumKpa - minimumKpa);
  const paddedMinimumKpa = Math.floor((minimumKpa - spanKpa * 0.08) * 2) / 2;
  const paddedMaximumKpa = Math.ceil((maximumKpa + spanKpa * 0.08) * 2) / 2;
  const tickStepKpa = (paddedMaximumKpa - paddedMinimumKpa) / 4;
  return {
    minimumKpa: paddedMinimumKpa,
    maximumKpa: paddedMaximumKpa,
    ticksKpa: Array.from(
      { length: 5 },
      (_, index) => paddedMinimumKpa + tickStepKpa * index,
    ),
  };
};

const getRecordedPressureGraphDomain = (
  measurement: PistonOscillationGuideSavedMeasurement,
): PressureGraphDomain => {
  const visibleDurationS = Math.min(
    measurement.acquisitionSettings.recordedDurationS,
    0.8,
  );
  const visibleSamples = measurement.samples.filter((sample) => sample.timeS <= visibleDurationS);
  return getObservedPressureGraphDomain(visibleSamples);
};

const getObservedPressureKpa = (
  samples: readonly PistonOscillationObservedSample[],
  timeS: number,
  sampleRateHz: number,
) => {
  const first = samples[0];
  const last = samples.at(-1);
  if (!first || !last) return PISTON_ACQUISITION_BASELINE_PRESSURE_KPA;
  if (timeS <= first.timeS) return first.absolutePressureKpa;
  if (timeS >= last.timeS) return last.absolutePressureKpa;
  const sampleIndex = Math.max(
    0,
    Math.min(samples.length - 1, Math.floor(timeS * sampleRateHz + 1e-9)),
  );
  return samples[sampleIndex]?.absolutePressureKpa ?? first.absolutePressureKpa;
};

const pressureToY = (pressureKpa: number, domain: PressureGraphDomain) => {
  const normalized = (pressureKpa - domain.minimumKpa)
    / (domain.maximumKpa - domain.minimumKpa);
  return GRAPH_BOTTOM - normalized * (GRAPH_BOTTOM - GRAPH_TOP);
};

const buildPressurePath = (
  samples: readonly PistonOscillationObservedSample[],
  durationSeconds: number,
  minimumDomainSeconds: number,
  graphRight: number,
  pressureDomain: PressureGraphDomain,
) => {
  const domainSeconds = Math.max(minimumDomainSeconds, durationSeconds);
  const points: string[] = [];
  for (const sample of samples) {
    if (sample.timeS > durationSeconds + 1e-12) break;
    const x = GRAPH_LEFT
      + (sample.timeS / domainSeconds) * (graphRight - GRAPH_LEFT);
    const y = pressureToY(sample.absolutePressureKpa, pressureDomain);
    points.push(`${points.length === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(' ');
};

const buildPressureSampleMarkerPath = (
  samples: readonly PistonOscillationObservedSample[],
  durationSeconds: number,
  minimumDomainSeconds: number,
  graphRight: number,
  pressureDomain: PressureGraphDomain,
) => {
  if (samples.length === 0) return '';
  const domainSeconds = Math.max(minimumDomainSeconds, durationSeconds);
  const plotWidth = Math.max(1, graphRight - GRAPH_LEFT);
  let visibleSampleCount = 0;
  while (
    visibleSampleCount < samples.length
    && samples[visibleSampleCount]!.timeS <= durationSeconds + 1e-12
  ) {
    visibleSampleCount += 1;
  }
  const markerStride = Math.max(1, Math.ceil(visibleSampleCount / (plotWidth / 3)));
  const markerRadius = 1.8;
  const markers: string[] = [];
  for (let index = 0; index < visibleSampleCount; index += markerStride) {
    const sample = samples[index];
    if (!sample) continue;
    const x = GRAPH_LEFT + (sample.timeS / domainSeconds) * plotWidth;
    const y = pressureToY(sample.absolutePressureKpa, pressureDomain);
    markers.push(
      `M ${(x - markerRadius).toFixed(2)} ${y.toFixed(2)} `
      + `a ${markerRadius.toFixed(2)} ${markerRadius.toFixed(2)} 0 1 0 ${(markerRadius * 2).toFixed(2)} 0 `
      + `a ${markerRadius.toFixed(2)} ${markerRadius.toFixed(2)} 0 1 0 ${(-markerRadius * 2).toFixed(2)} 0`,
    );
  }
  return markers.join(' ');
};

export const PistonOscillationAcquisitionPanel = forwardRef<
PistonOscillationAcquisitionPanelHandle,
PistonOscillationAcquisitionPanelProps
>(({
  language,
  powerOn,
  releaseEvent,
  pressStartEvent = null,
  livePressureChannel,
  demoFrame: providedDemoFrame,
  demoPlaybackChannel,
  demoPlaybackFileId,
  guideSession,
  freeSession,
  guidePauseReady = true,
  onGuideParameterEdit,
  onGuideParameterCommit,
  onFreeAcquisitionSettingCommit,
  onFreeCandidateChange,
  onFreeMeasurementSave,
  guidePaused = false,
  guideCue = null,
  onGuideAcquisitionEvent,
  onGuideActionAttempt,
  onRunRetained,
}, ref) => {
  const copy = getPistonOscillationShellCopy(language).acquisition;
  const livePressureObservation = useSyncExternalStore(
    livePressureChannel?.subscribe ?? subscribeToNoLivePressure,
    livePressureChannel?.getSnapshot ?? getNoLivePressure,
    getNoLivePressure,
  );
  const demoPlaybackSnapshot = useSyncExternalStore(
    demoPlaybackChannel?.subscribe ?? subscribeToNoDemoPlayback,
    demoPlaybackChannel?.getSnapshot ?? getNoDemoPlaybackSnapshot,
    getNoDemoPlaybackSnapshot,
  );
  const demoFrame = useMemo(() => {
    if (providedDemoFrame) return providedDemoFrame;
    if (
      !demoPlaybackFileId
      || demoPlaybackSnapshot.fileId !== demoPlaybackFileId
      || (
        demoPlaybackSnapshot.phase !== 'running'
        && demoPlaybackSnapshot.phase !== 'paused'
        && demoPlaybackSnapshot.phase !== 'completed'
      )
    ) return undefined;
    return getPistonOscillationDemoFrame(demoPlaybackSnapshot.elapsedMs, language);
  }, [demoPlaybackFileId, demoPlaybackSnapshot, language, providedDemoFrame]);
  const effectivePowerOn = demoFrame?.powerOn ?? powerOn;
  const [guideRejectedControl, setGuideRejectedControl] = useState<
    'settings' | 'primary' | 'save' | null
  >(null);
  const guideRejectedControlTimerRef = useRef<number | null>(null);
  const attemptGuideAction = useCallback((
    action: PistonOscillationGuideAction,
    control: 'settings' | 'primary' | 'save',
  ) => {
    const result = onGuideActionAttempt?.(action, {});
    if (!result || result.allowed) return true;
    if (guideRejectedControlTimerRef.current !== null) {
      window.clearTimeout(guideRejectedControlTimerRef.current);
    }
    setGuideRejectedControl(control);
    guideRejectedControlTimerRef.current = window.setTimeout(() => {
      guideRejectedControlTimerRef.current = null;
      setGuideRejectedControl(null);
    }, 520);
    return false;
  }, [onGuideActionAttempt]);
  useEffect(() => () => {
    if (guideRejectedControlTimerRef.current !== null) {
      window.clearTimeout(guideRejectedControlTimerRef.current);
    }
  }, []);
  const [phase, setPhase] = useState<AcquisitionPhase>('idle');
  const phaseRef = useRef<AcquisitionPhase>('idle');
  const [guidePressureIssue, setGuidePressureIssue] = useState<
    'underpressure' | 'overpressure' | null
  >(null);
  const [sampleRateDraft, setSampleRateDraft] = useState(() => (
    freeSession?.sampleRateHz == null ? '' : String(freeSession.sampleRateHz)
  ));
  const [triggerDraft, setTriggerDraft] = useState(() => (
    freeSession?.triggerThresholdKpa == null ? '' : String(freeSession.triggerThresholdKpa)
  ));
  const sampleRateInputRef = useRef<HTMLInputElement | null>(null);
  const triggerInputRef = useRef<HTMLInputElement | null>(null);
  const [freeParameterFeedback, setFreeParameterFeedback] = useState<string | null>(null);
  const freeParameterFeedbackTimerRef = useRef<number | null>(null);
  const freeCommitRejectedRef = useRef(false);
  const [cycleStartMs, setCycleStartMs] = useState<number | null>(null);
  const [triggerSeconds, setTriggerSeconds] = useState<number | null>(null);
  const [triggerSourceSampleIndex, setTriggerSourceSampleIndex] = useState<number | null>(null);
  const [freeRecordingPath, setFreeRecordingPath] = useState<FreeRecordingPath>(
    'falling-trigger',
  );
  const [immediateReleaseOffsetS, setImmediateReleaseOffsetS] = useState<number | null>(null);
  const [activeTrajectory, setActiveTrajectory] =
    useState<PistonOscillationTrajectory | null>(null);
  const [activeObservationSeries, setActiveObservationSeries] =
    useState<PistonOscillationSensorObservationSeries | null>(null);
  const [activePressOperationEvidence, setActivePressOperationEvidence] =
    useState<PistonOscillationPressOperationEvidence | null>(null);
  const [freeRecordingTimelineRevision, setFreeRecordingTimelineRevision] = useState(0);
  const [displayNowMs, setDisplayNowMs] = useState(() => performance.now());
  const [stopElapsedSeconds, setStopElapsedSeconds] = useState<number | null>(null);
  const [retained, setRetained] = useState(false);
  const frozenFreeCandidateRef = useRef<PistonOscillationRawMeasurementRecord | null>(
    freeSession?.acquisitionCandidate ?? null,
  );
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [graphWidth, setGraphWidth] = useState(GRAPH_DEFAULT_WIDTH);
  const [freeRunPressureGraphDomain, setFreeRunPressureGraphDomain] =
    useState<PressureGraphDomain | null>(null);
  const guideSelected = guideSession?.status === 'active'
    || guideSession?.status === 'completed';
  const guideActive = guideSession?.status === 'active';
  const freeSelected = freeSession?.status === 'active';
  const configuredTriggerKpa = guideSelected
    ? Number(guideSession?.parameterDrafts.triggerThresholdKpa)
      || PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA
    : freeSelected
      ? freeSession.triggerThresholdKpa ?? PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA
      : Number(triggerDraft) || PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA;
  const freeSampleRateValid = freeSelected
    && freeSession.sampleRateHz !== null
    && parsePistonOscillationFreeSampleRate(String(freeSession.sampleRateHz)) !== null;
  const freeTriggerThresholdValid = freeSelected
    && freeSession.triggerThresholdKpa !== null
    && parsePistonOscillationFreeTriggerThreshold(
      String(freeSession.triggerThresholdKpa),
    ) !== null;
  const freeAcquisitionParametersValid = freeSampleRateValid && freeTriggerThresholdValid;
  const guideSessionStartedAtMs = guideSession === undefined
    ? undefined
    : guideSession.startedAtMs;
  const freeSessionStartedAtMs = freeSession?.startedAtMs;
  const guideMeasurementIndex = guideSession?.measurementIndex;
  const guideParameterSetupActive = guideActive
    && guideSession.step === 'parameterSetup'
    && guideCue === 'settings';
  const guideTriggeredNotifiedRef = useRef(false);
  const guideRecordingReadyNotifiedRef = useRef(false);
  const guidePendingOverpressurePeakKpaRef = useRef<number | null>(null);
  const handledReleaseEventIdRef = useRef<number | null>(releaseEvent?.id ?? null);
  const handledPressStartEventIdRef = useRef<number | null>(pressStartEvent?.id ?? null);
  const freeReleaseSegmentsRef = useRef<PistonOscillationRecordingReleaseSegment[]>([]);
  const freePressStartedAtMsRef = useRef<number[]>([]);
  const freeLiveObservationsRef = useRef<PistonOscillationLivePressureObservation[]>([]);
  const freeAttemptIdRef = useRef<string | null>(null);
  const preTriggerPeakPressureKpaRef = useRef(
    quantizePistonOscillationObservedPressureKpa(
      PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
    ),
  );
  const guidePauseStartedAtMsRef = useRef<number | null>(null);
  const guideAccumulatedPauseMsRef = useRef(0);
  const previousGuideMeasurementIndexRef = useRef(guideMeasurementIndex);
  const previousFreeMeasurementIndexRef = useRef(freeSession?.measurementIndex);
  const previousPowerOnRef = useRef(effectivePowerOn);

  useEffect(() => {
    if (!freeSession) return;
    setSampleRateDraft(freeSession.sampleRateHz === null ? '' : String(freeSession.sampleRateHz));
    setTriggerDraft(
      freeSession.triggerThresholdKpa === null ? '' : String(freeSession.triggerThresholdKpa),
    );
    frozenFreeCandidateRef.current = freeSession.acquisitionCandidate;
  }, [
    freeSession?.acquisitionCandidate,
    freeSession?.measurementIndex,
    freeSession?.sampleRateHz,
    freeSession?.startedAtMs,
    freeSession?.triggerThresholdKpa,
  ]);

  useEffect(() => () => {
    if (freeParameterFeedbackTimerRef.current !== null) {
      window.clearTimeout(freeParameterFeedbackTimerRef.current);
    }
  }, []);

  const showFreeParameterFeedback = useCallback((message: string) => {
    if (freeParameterFeedbackTimerRef.current !== null) {
      window.clearTimeout(freeParameterFeedbackTimerRef.current);
    }
    setFreeParameterFeedback(message);
    freeParameterFeedbackTimerRef.current = window.setTimeout(() => {
      freeParameterFeedbackTimerRef.current = null;
      setFreeParameterFeedback(null);
    }, 2500);
  }, []);

  useLayoutEffect(() => {
    const chartWrap = chartWrapRef.current;
    if (!chartWrap) return undefined;
    const updateGraphWidth = () => {
      const { width } = chartWrap.getBoundingClientRect();
      const plotHeight = chartWrap.querySelector('svg')?.getBoundingClientRect().height ?? 0;
      if (width <= 0 || plotHeight <= 0) return;
      const nextWidth = Math.round(Math.max(
        720,
        Math.min(1400, GRAPH_HEIGHT * width / plotHeight),
      ));
      setGraphWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
    };
    updateGraphWidth();
    const resizeObserver = new ResizeObserver(updateGraphWidth);
    resizeObserver.observe(chartWrap);
    return () => resizeObserver.disconnect();
  }, []);

  const updatePhase = useCallback((nextPhase: AcquisitionPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const resetRun = useCallback(() => {
    updatePhase('idle');
    setCycleStartMs(null);
    setTriggerSeconds(null);
    setTriggerSourceSampleIndex(null);
    setFreeRecordingPath('falling-trigger');
    setImmediateReleaseOffsetS(null);
    setActiveTrajectory(null);
    setActiveObservationSeries(null);
    setActivePressOperationEvidence(null);
    setStopElapsedSeconds(null);
    setRetained(false);
    setFreeRunPressureGraphDomain(null);
    frozenFreeCandidateRef.current = null;
    freeReleaseSegmentsRef.current = [];
    freePressStartedAtMsRef.current = [];
    freeLiveObservationsRef.current = [];
    freeAttemptIdRef.current = null;
    setGuidePressureIssue(null);
    setDisplayNowMs(performance.now());
    guideTriggeredNotifiedRef.current = false;
    guideRecordingReadyNotifiedRef.current = false;
    guidePendingOverpressurePeakKpaRef.current = null;
    preTriggerPeakPressureKpaRef.current = quantizePistonOscillationObservedPressureKpa(
      PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
    );
    guidePauseStartedAtMsRef.current = null;
    guideAccumulatedPauseMsRef.current = 0;
  }, [updatePhase]);

  useEffect(() => {
    const wasPowerOn = previousPowerOnRef.current;
    previousPowerOnRef.current = effectivePowerOn;
    if (!wasPowerOn || effectivePowerOn) return;
    resetRun();
  }, [effectivePowerOn, resetRun]);

  useEffect(() => {
    if (
      !livePressureObservation
      || phaseRef.current !== 'armed'
      || cycleStartMs !== null
    ) return;
    preTriggerPeakPressureKpaRef.current = Math.max(
      preTriggerPeakPressureKpaRef.current,
      livePressureObservation.absolutePressureKpa,
    );
  }, [cycleStartMs, livePressureObservation]);

  useEffect(() => {
    if (!pressStartEvent || handledPressStartEventIdRef.current === pressStartEvent.id) {
      return;
    }
    handledPressStartEventIdRef.current = pressStartEvent.id;
    if (
      !freeSelected
      || phaseRef.current !== 'recording'
      || cycleStartMs === null
      || triggerSeconds === null
    ) return;
    const recordingStartedAtMs = cycleStartMs + triggerSeconds * 1_000;
    if (pressStartEvent.startedAtMs < recordingStartedAtMs) return;
    const pressStarts = freePressStartedAtMsRef.current;
    if (pressStarts.at(-1) === pressStartEvent.startedAtMs) return;
    pressStarts.push(pressStartEvent.startedAtMs);
    if (livePressureObservation) {
      const observations = freeLiveObservationsRef.current;
      const last = observations.at(-1);
      if (!last || last.sampledAtMs < livePressureObservation.sampledAtMs) {
        observations.push(livePressureObservation);
      }
    }
    setFreeRecordingTimelineRevision((revision) => revision + 1);
  }, [
    cycleStartMs,
    freeSelected,
    livePressureObservation,
    pressStartEvent,
    triggerSeconds,
  ]);

  useEffect(() => {
    const latestRelease = freeReleaseSegmentsRef.current.at(-1) ?? null;
    const latestPressStartedAtMs = freePressStartedAtMsRef.current.at(-1) ?? null;
    const livePressureControlsRecording = (
      freeRecordingPath === 'immediate' && latestRelease === null
    ) || (
      latestPressStartedAtMs !== null
      && (
        latestRelease === null
        || latestPressStartedAtMs > latestRelease.startedAtMs
      )
    );
    if (
      !freeSelected
      || phaseRef.current !== 'recording'
      || cycleStartMs === null
      || triggerSeconds === null
      || !livePressureControlsRecording
      || !livePressureObservation
      || livePressureObservation.sampledAtMs < cycleStartMs + triggerSeconds * 1_000
    ) return;
    const observations = freeLiveObservationsRef.current;
    const last = observations.at(-1);
    if (last?.sampledAtMs === livePressureObservation.sampledAtMs) {
      observations[observations.length - 1] = livePressureObservation;
      return;
    }
    observations.push(livePressureObservation);
  }, [
    cycleStartMs,
    freeRecordingPath,
    freeRecordingTimelineRevision,
    freeSelected,
    livePressureObservation,
    triggerSeconds,
  ]);

  useEffect(() => {
    if (guideSessionStartedAtMs === undefined) return;
    resetRun();
  }, [guideSessionStartedAtMs, resetRun]);

  useEffect(() => {
    if (freeSessionStartedAtMs === undefined || freeSessionStartedAtMs === null) return;
    resetRun();
  }, [freeSessionStartedAtMs, resetRun]);

  useEffect(() => {
    const previousMeasurementIndex = previousGuideMeasurementIndexRef.current;
    previousGuideMeasurementIndexRef.current = guideMeasurementIndex;
    if (
      guideMeasurementIndex === undefined
      || previousMeasurementIndex === undefined
      || guideMeasurementIndex === previousMeasurementIndex
    ) return;
    resetRun();
  }, [guideMeasurementIndex, resetRun]);

  useEffect(() => {
    const freeMeasurementIndex = freeSession?.measurementIndex;
    const previousMeasurementIndex = previousFreeMeasurementIndexRef.current;
    previousFreeMeasurementIndexRef.current = freeMeasurementIndex;
    if (
      freeMeasurementIndex === undefined
      || previousMeasurementIndex === undefined
      || freeMeasurementIndex === previousMeasurementIndex
    ) return;
    resetRun();
  }, [freeSession?.measurementIndex, resetRun]);

  useEffect(() => {
    if (!guideActive || !effectivePowerOn) return;
    const guideStep = guideSession.step;
    if (guideStep === 'waitingTrigger' && phaseRef.current === 'idle') {
      resetRun();
      handledReleaseEventIdRef.current = releaseEvent?.id ?? null;
      updatePhase('armed');
      return;
    }
    if (
      guideStep === 'recording'
      && guideSession.acquisitionCandidate === null
      && phaseRef.current === 'idle'
    ) {
      resetRun();
      handledReleaseEventIdRef.current = releaseEvent?.id ?? null;
      updatePhase('armed');
      onGuideAcquisitionEvent?.({ type: 'restoreInterruptedAcquisition' });
    }
  }, [
    guideActive,
    effectivePowerOn,
    guideMeasurementIndex,
    guideSession?.acquisitionCandidate,
    guideSession?.step,
    guideSessionStartedAtMs,
    onGuideAcquisitionEvent,
    releaseEvent?.id,
    resetRun,
    updatePhase,
  ]);

  useEffect(() => {
    const nowMs = performance.now();
    if (guidePaused) {
      guidePauseStartedAtMsRef.current ??= nowMs;
      return;
    }
    if (guidePauseStartedAtMsRef.current !== null) {
      guideAccumulatedPauseMsRef.current += nowMs - guidePauseStartedAtMsRef.current;
      guidePauseStartedAtMsRef.current = null;
      setDisplayNowMs(nowMs);
    }
  }, [guidePaused]);

  useEffect(() => {
    const freeRecordingActive = freeSelected
      && phaseRef.current === 'recording'
      && cycleStartMs !== null
      && triggerSeconds !== null;
    if (
      !effectivePowerOn
      || !releaseEvent
      || (phaseRef.current !== 'armed' && !freeRecordingActive)
    ) return;
    if (handledReleaseEventIdRef.current === releaseEvent.id) return;
    handledReleaseEventIdRef.current = releaseEvent.id;
    const nextTrajectory = releaseEvent.trajectory;
    const nextObservationSeries = createPistonOscillationDynamicSensorObservationSeries(
      nextTrajectory.samples,
      nextTrajectory.sampleRateHz,
      {
        initialState: livePressureObservation?.sensorState ?? null,
        initialObservedPressureKpa:
          livePressureObservation?.absolutePressureKpa ?? null,
        config: livePressureObservation?.sensorConfig,
      },
    );
    const nextReleaseSegment: PistonOscillationRecordingReleaseSegment = {
      startedAtMs: releaseEvent.startedAtMs,
      observationSeries: nextObservationSeries,
    };
    if (freeRecordingActive) {
      freeReleaseSegmentsRef.current = [
        ...freeReleaseSegmentsRef.current.filter(
          (segment) => segment.startedAtMs < releaseEvent.startedAtMs,
        ),
        nextReleaseSegment,
      ];
      if (activeTrajectory === null) {
        setActiveTrajectory(nextTrajectory);
        setActiveObservationSeries(nextObservationSeries);
        setActivePressOperationEvidence(releaseEvent.pressOperationEvidence);
      }
      if (freeRecordingPath === 'immediate' && immediateReleaseOffsetS === null) {
        setImmediateReleaseOffsetS(Math.max(
          0,
          (releaseEvent.startedAtMs - cycleStartMs) / 1_000,
        ));
      }
      setFreeRecordingTimelineRevision((revision) => revision + 1);
      setDisplayNowMs(performance.now());
      return;
    }
    const nextTriggerSample = findPistonOscillationObservedFallingTriggerSample(
      nextObservationSeries,
      configuredTriggerKpa,
    );
    const nextTriggerSeconds = nextTriggerSample?.timeS ?? null;
    if (guideActive) {
      const releasePressureKpa = nextObservationSeries.samples[0]?.absolutePressureKpa
        ?? Number.NEGATIVE_INFINITY;
      const peakPressureKpa = Math.max(
        preTriggerPeakPressureKpaRef.current,
        releasePressureKpa,
      );
      if (peakPressureKpa < PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA) {
        guidePendingOverpressurePeakKpaRef.current = null;
        setGuidePressureIssue('underpressure');
        setCycleStartMs(null);
        setTriggerSeconds(null);
        setTriggerSourceSampleIndex(null);
        setActiveTrajectory(null);
        setActiveObservationSeries(null);
        setActivePressOperationEvidence(null);
        setStopElapsedSeconds(null);
        preTriggerPeakPressureKpaRef.current = quantizePistonOscillationObservedPressureKpa(
          PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
        );
        onGuideAcquisitionEvent?.({
          type: 'pressureAttemptRejected',
          reason: 'underpressure',
          peakPressureKpa,
        });
        return;
      } else if (peakPressureKpa > PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA) {
        guidePendingOverpressurePeakKpaRef.current = peakPressureKpa;
        setGuidePressureIssue(null);
        preTriggerPeakPressureKpaRef.current = peakPressureKpa;
      } else {
        guidePendingOverpressurePeakKpaRef.current = null;
        setGuidePressureIssue(null);
        preTriggerPeakPressureKpaRef.current = peakPressureKpa;
        onGuideAcquisitionEvent?.({ type: 'pressureAttemptAccepted', peakPressureKpa });
      }
    }
    setActiveTrajectory(nextTrajectory);
    setActiveObservationSeries(nextObservationSeries);
    setActivePressOperationEvidence(releaseEvent.pressOperationEvidence);
    if (freeSelected) {
      freeReleaseSegmentsRef.current = [nextReleaseSegment];
      freePressStartedAtMsRef.current = [];
      freeLiveObservationsRef.current = [];
      setFreeRecordingTimelineRevision((revision) => revision + 1);
    }
    setCycleStartMs(releaseEvent.startedAtMs);
    setTriggerSeconds(nextTriggerSeconds);
    setTriggerSourceSampleIndex(nextTriggerSample?.sampleIndex ?? null);
    setDisplayNowMs(performance.now());
    guideTriggeredNotifiedRef.current = false;
    guideRecordingReadyNotifiedRef.current = false;
    guidePauseStartedAtMsRef.current = null;
    guideAccumulatedPauseMsRef.current = 0;
  }, [
    configuredTriggerKpa,
    cycleStartMs,
    effectivePowerOn,
    freeRecordingPath,
    freeSelected,
    guideActive,
    immediateReleaseOffsetS,
    livePressureObservation,
    onGuideAcquisitionEvent,
    releaseEvent,
    triggerSeconds,
    activeTrajectory,
  ]);

  useEffect(() => {
    if (
      !effectivePowerOn
      || cycleStartMs === null
      || guidePaused
      || (phase !== 'armed' && phase !== 'recording')
    ) return;
    let frame = 0;
    let lastDisplayUpdateMs = 0;
    const animate = (nowMs: number) => {
      if (
        lastDisplayUpdateMs === 0
        || nowMs - lastDisplayUpdateMs >= ACQUISITION_DISPLAY_FRAME_INTERVAL_MS
      ) {
        lastDisplayUpdateMs = nowMs;
        setDisplayNowMs(nowMs);
      }
      if (
        phaseRef.current === 'armed'
        && triggerSeconds !== null
        && (
          nowMs - cycleStartMs - guideAccumulatedPauseMsRef.current
        ) / 1000 >= triggerSeconds
      ) {
        updatePhase('recording');
        if (guideActive && !guideTriggeredNotifiedRef.current) {
          guideTriggeredNotifiedRef.current = true;
          onGuideAcquisitionEvent?.({ type: 'triggered' });
        }
      }
      if (phaseRef.current === 'armed' || phaseRef.current === 'recording') {
        frame = window.requestAnimationFrame(animate);
      }
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [
    cycleStartMs,
    effectivePowerOn,
    guideActive,
    guidePaused,
    onGuideAcquisitionEvent,
    phase,
    triggerSeconds,
    updatePhase,
  ]);

  const localElapsedSinceReleaseSeconds = cycleStartMs === null
    ? null
    : Math.max(
      0,
      (
        displayNowMs
        - cycleStartMs
        - guideAccumulatedPauseMsRef.current
        - (
          guidePaused && guidePauseStartedAtMsRef.current !== null
            ? Math.max(0, displayNowMs - guidePauseStartedAtMsRef.current)
            : 0
        )
      ) / 1000,
    );
  const localFormalElapsedSeconds = triggerSeconds === null || localElapsedSinceReleaseSeconds === null
    ? 0
    : Math.max(
      0,
      stopElapsedSeconds ?? localElapsedSinceReleaseSeconds - triggerSeconds,
    );
  const restoredGuidePauseCandidate = !demoFrame
    && activeTrajectory === null
    && guideSession?.step === 'pauseAvailable'
    ? guideSession.acquisitionCandidate
    : null;
  const restoredGuideCandidate = !demoFrame
    && activeTrajectory === null
    && (guideSession?.step === 'curveFrozen' || guideSession?.step === 'awaitingSaveOrRedo')
    ? guideSession.acquisitionCandidate
    : null;
  const restoredGuideSavedMeasurement = !demoFrame
    && activeTrajectory === null
    && (
      guideSession?.status === 'completed'
      || guideSession?.step === 'powerOff'
      || guideSession?.step === 'calculationReady'
    )
    ? guideSession.savedMeasurements.find(
        (measurement) => measurement.measurementIndex === guideSession.measurementIndex,
      ) ?? null
    : null;
  const restoredFreeCandidate = !demoFrame
    && activeTrajectory === null
    && freeSelected
    ? freeSession.acquisitionCandidate
    : null;
  const restoredGuideMeasurement = restoredGuidePauseCandidate
    ?? restoredGuideCandidate
    ?? restoredGuideSavedMeasurement;
  const restoredMeasurement = restoredGuideMeasurement ?? restoredFreeCandidate;
  const demoActive = demoFrame !== undefined;
  const demoTrajectory = useMemo(
    () => demoFrame
      ? getPistonOscillationDemoTrajectory(demoFrame.measurementIndex)
      : null,
    [demoFrame?.measurementIndex],
  );
  const demoObservationSeries = useMemo(
    () => demoTrajectory
      ? createPistonOscillationSensorObservationSeries(
        demoTrajectory.samples,
        demoTrajectory.sampleRateHz,
      )
      : null,
    [demoTrajectory],
  );
  const demoTriggerSample = useMemo(
    () => demoObservationSeries
      ? findPistonOscillationObservedFallingTriggerSample(
        demoObservationSeries,
        PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA,
      )
      : null,
    [demoObservationSeries],
  );
  const effectivePhase = demoFrame?.acquisitionPhase
    ?? (restoredGuidePauseCandidate
      ? 'recording'
      : restoredMeasurement ? 'stopped' : phase);
  const effectiveTriggerKpa = demoFrame
    ? Number(demoFrame.triggerInput) || PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA
    : restoredMeasurement?.acquisitionSettings.triggerThresholdKpa ?? configuredTriggerKpa;
  const pressureGraphTriggerKpa = parsePistonOscillationFreeTriggerThreshold(
    String(effectiveTriggerKpa),
  ) ?? PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA;
  const effectiveTriggerSeconds = demoFrame
    ? demoTriggerSample?.timeS ?? null
    : restoredMeasurement ? 0 : triggerSeconds;
  const elapsedSinceReleaseSeconds = restoredMeasurement
    ?.acquisitionSettings.recordedDurationS
    ?? demoFrame?.releaseElapsedSeconds
    ?? localElapsedSinceReleaseSeconds;
  const formalElapsedSeconds = restoredMeasurement
    ?.acquisitionSettings.recordedDurationS
    ?? demoFrame?.formalElapsedSeconds
    ?? localFormalElapsedSeconds;
  const getCurrentRecordingElapsedSeconds = () => {
    if (
      cycleStartMs === null
      || triggerSeconds === null
      || stopElapsedSeconds !== null
      || restoredMeasurement
      || demoFrame
    ) return formalElapsedSeconds;
    const nowMs = performance.now();
    const activePauseMs = guidePaused && guidePauseStartedAtMsRef.current !== null
      ? Math.max(0, nowMs - guidePauseStartedAtMsRef.current)
      : 0;
    return Math.max(
      0,
      (
        nowMs
        - cycleStartMs
        - guideAccumulatedPauseMsRef.current
        - activePauseMs
      ) / 1_000 - triggerSeconds,
    );
  };
  const graphMinimumDomainSeconds = guideSelected || demoFrame
    ? PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S
    : 0.8;
  const displayedObservationSamples = useMemo<PistonOscillationObservedSample[]>(() => {
    if (restoredGuideMeasurement) return restoredGuideMeasurement.samples;
    if (restoredFreeCandidate) return restoredFreeCandidate.samples;
    if (
      freeSelected
      && cycleStartMs !== null
      && triggerSeconds !== null
      && (phase === 'recording' || phase === 'stopped')
    ) {
      return createPistonOscillationContinuousRecordingSamples({
        durationS: formalElapsedSeconds,
        sampleRateHz: freeSession?.sampleRateHz
          ?? PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
        recordingStartedAtMs: cycleStartMs + triggerSeconds * 1_000,
        releaseSegments: freeReleaseSegmentsRef.current,
        pressStartedAtMs: freePressStartedAtMsRef.current,
        liveObservations: freeLiveObservationsRef.current,
      });
    }
    if (formalElapsedSeconds <= 0 || effectiveTriggerSeconds === null) return [];
    if (demoObservationSeries && demoTriggerSample) {
      const maximumIntervalCount = Math.max(
        0,
        demoObservationSeries.samples.length - demoTriggerSample.sampleIndex - 1,
      );
      const intervalCount = Math.min(
        maximumIntervalCount,
        Math.max(0, Math.floor(
          formalElapsedSeconds * demoObservationSeries.sampleRateHz + 1e-9,
        )),
      );
      return createPistonOscillationRecordedObservationSamples(
        demoObservationSeries,
        demoTriggerSample.sampleIndex,
        intervalCount / demoObservationSeries.sampleRateHz,
      );
    }
    if (activeObservationSeries && triggerSourceSampleIndex !== null) {
      const maximumIntervalCount = Math.max(
        0,
        activeObservationSeries.samples.length - triggerSourceSampleIndex - 1,
      );
      const intervalCount = Math.min(
        maximumIntervalCount,
        Math.max(0, Math.floor(
          formalElapsedSeconds * activeObservationSeries.sampleRateHz + 1e-9,
        )),
      );
      return createPistonOscillationRecordedObservationSamples(
        activeObservationSeries,
        triggerSourceSampleIndex,
        intervalCount / activeObservationSeries.sampleRateHz,
      );
    }
    return [];
  }, [
    activeObservationSeries,
    cycleStartMs,
    demoObservationSeries,
    demoTriggerSample,
    effectiveTriggerSeconds,
    formalElapsedSeconds,
    freeRecordingPath,
    freeRecordingTimelineRevision,
    freeSelected,
    freeSession?.sampleRateHz,
    livePressureObservation,
    phase,
    restoredFreeCandidate,
    restoredGuideMeasurement,
    restoredMeasurement,
    triggerSourceSampleIndex,
    triggerSeconds,
  ]);
  const getEffectivePressureKpa = useCallback((secondsSinceRelease: number) => {
    if (restoredMeasurement) {
      return getObservedPressureKpa(
        restoredMeasurement.samples,
        secondsSinceRelease,
        restoredMeasurement.acquisitionSettings.sampleRateHz,
      );
    }
    if (activeObservationSeries) {
      return getObservedPressureKpa(
        activeObservationSeries.samples,
        secondsSinceRelease,
        activeObservationSeries.sampleRateHz,
      );
    }
    if (demoObservationSeries) {
      return getObservedPressureKpa(
        demoObservationSeries.samples,
        secondsSinceRelease,
        demoObservationSeries.sampleRateHz,
      );
    }
    return quantizePistonOscillationObservedPressureKpa(
      PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
    );
  }, [activeObservationSeries, demoObservationSeries, restoredMeasurement]);
  const currentPressureKpa = elapsedSinceReleaseSeconds === null
    ? effectivePhase === 'armed' && livePressureObservation
      ? livePressureObservation.absolutePressureKpa
      : quantizePistonOscillationObservedPressureKpa(
        PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
      )
    : freeSelected && displayedObservationSamples.length > 0
      ? displayedObservationSamples.at(-1)!.absolutePressureKpa
      : getEffectivePressureKpa(elapsedSinceReleaseSeconds);
  const sampleCount = effectivePhase === 'idle' || effectivePhase === 'armed'
    ? 0
    : displayedObservationSamples.length;
  const graphRight = graphWidth - GRAPH_RIGHT_MARGIN;
  const graphCenterX = (GRAPH_LEFT + graphRight) / 2;
  const observedPressureGraphDomain = useMemo(
    () => {
      const domain = restoredMeasurement
      ? getRecordedPressureGraphDomain(restoredMeasurement)
      : freeSelected && displayedObservationSamples.length > 0
        ? getObservedPressureGraphDomain(displayedObservationSamples)
      : demoObservationSeries && demoTriggerSample
        ? getObservedPressureGraphDomain(demoObservationSeries.samples.slice(
          demoTriggerSample.sampleIndex,
          Math.min(
            demoObservationSeries.samples.length,
            demoTriggerSample.sampleIndex
              + Math.floor(graphMinimumDomainSeconds * demoObservationSeries.sampleRateHz)
              + 1,
          ),
        ).map((sample, sampleIndex) => ({
          sampleIndex,
          timeS: getPistonOscillationObservedTimeS(
            sampleIndex,
            demoObservationSeries.sampleRateHz,
          ),
          absolutePressureKpa: sample.absolutePressureKpa,
        })))
      : activeObservationSeries && triggerSourceSampleIndex !== null
        ? getObservedPressureGraphDomain(activeObservationSeries.samples.slice(
          triggerSourceSampleIndex,
          Math.min(
            activeObservationSeries.samples.length,
            triggerSourceSampleIndex
              + Math.floor(graphMinimumDomainSeconds * activeObservationSeries.sampleRateHz)
              + 1,
          ),
        ).map((sample, sampleIndex) => ({
          sampleIndex,
          timeS: getPistonOscillationObservedTimeS(
            sampleIndex,
            activeObservationSeries.sampleRateHz,
          ),
          absolutePressureKpa: sample.absolutePressureKpa,
        })))
        : DEFAULT_PRESSURE_GRAPH_DOMAIN;
      return guideSelected || demoFrame
        ? getGuidedPressureGraphDomain(domain)
        : domain;
    },
    [
      activeObservationSeries,
      demoObservationSeries,
      demoTriggerSample,
      demoFrame,
      displayedObservationSamples,
      freeSelected,
      graphMinimumDomainSeconds,
      guideSelected,
      restoredMeasurement,
      triggerSourceSampleIndex,
    ],
  );
  const adaptiveFreePressureGraphDomain = useMemo(
    () => getPistonOscillationAdaptivePressureGraphDomain(
      pressureGraphTriggerKpa,
      [
        PISTON_ACQUISITION_BASELINE_PRESSURE_KPA,
        currentPressureKpa,
        ...displayedObservationSamples.map((sample) => sample.absolutePressureKpa),
      ],
    ),
    [currentPressureKpa, displayedObservationSamples, pressureGraphTriggerKpa],
  );
  useEffect(() => {
    if (
      !freeSelected
      || (phaseRef.current !== 'armed' && phaseRef.current !== 'recording')
    ) return;
    setFreeRunPressureGraphDomain((current) => {
      if (!current) return adaptiveFreePressureGraphDomain;
      if (
        adaptiveFreePressureGraphDomain.minimumKpa >= current.minimumKpa
        && adaptiveFreePressureGraphDomain.maximumKpa <= current.maximumKpa
      ) return current;
      const currentStep = current.ticksKpa.length > 1
        ? current.ticksKpa[1]! - current.ticksKpa[0]!
        : 1;
      const nextStep = adaptiveFreePressureGraphDomain.ticksKpa.length > 1
        ? adaptiveFreePressureGraphDomain.ticksKpa[1]!
          - adaptiveFreePressureGraphDomain.ticksKpa[0]!
        : 1;
      const epsilon = Math.min(currentStep, nextStep) * 1e-6;
      return getPistonOscillationAdaptivePressureGraphDomain(pressureGraphTriggerKpa, [
        current.minimumKpa + epsilon,
        current.maximumKpa - epsilon,
        adaptiveFreePressureGraphDomain.minimumKpa + epsilon,
        adaptiveFreePressureGraphDomain.maximumKpa - epsilon,
      ]);
    });
  }, [adaptiveFreePressureGraphDomain, freeSelected, pressureGraphTriggerKpa]);
  const pressureGraphDomain = freeSelected
    ? freeRunPressureGraphDomain ?? adaptiveFreePressureGraphDomain
    : observedPressureGraphDomain;
  const pressurePath = useMemo(
    () => displayedObservationSamples.length === 0 || formalElapsedSeconds <= 0
      ? ''
      : buildPressurePath(
        displayedObservationSamples,
        formalElapsedSeconds,
        graphMinimumDomainSeconds,
        graphRight,
        pressureGraphDomain,
      ),
    [
      displayedObservationSamples,
      formalElapsedSeconds,
      graphMinimumDomainSeconds,
      graphRight,
      pressureGraphDomain,
    ],
  );
  const pressureSampleMarkerPath = useMemo(
    () => displayedObservationSamples.length === 0 || formalElapsedSeconds <= 0
      ? ''
      : buildPressureSampleMarkerPath(
        displayedObservationSamples,
        formalElapsedSeconds,
        graphMinimumDomainSeconds,
        graphRight,
        pressureGraphDomain,
      ),
    [
      displayedObservationSamples,
      formalElapsedSeconds,
      graphMinimumDomainSeconds,
      graphRight,
      pressureGraphDomain,
    ],
  );
  const graphDomainSeconds = Math.max(graphMinimumDomainSeconds, formalElapsedSeconds);
  const triggerY = pressureToY(effectiveTriggerKpa, pressureGraphDomain);
  const qualityUpperY = pressureToY(
    PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA,
    pressureGraphDomain,
  );
  const triggerValueVisible = demoFrame
    ? demoFrame.triggerInput.length > 0
    : guideSelected || (freeSelected && freeAcquisitionParametersValid);
  const pressureIndicatorVisible = Boolean(
    (guideSelected || freeSelected || demoActive)
    && (!freeSelected || freeAcquisitionParametersValid)
    && effectivePhase === 'armed'
    && !restoredMeasurement,
  );
  const pressureIndicatorState = currentPressureKpa
    < effectiveTriggerKpa
      ? 'below'
      : currentPressureKpa <= PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA
        ? 'valid'
        : 'over';
  const pressureIndicatorY = pressureToY(currentPressureKpa, pressureGraphDomain);

  const buildGuideCandidate = useCallback((durationS: number) => {
    if (
      !guideSession
      || !activeTrajectory
      || !activeObservationSeries
      || triggerSeconds === null
      || triggerSourceSampleIndex === null
    ) return null;
    const maximumIntervalCount = Math.max(
      0,
      activeObservationSeries.samples.length - triggerSourceSampleIndex - 1,
    );
    const requestedIntervalCount = Math.max(
      0,
      Math.floor(durationS * activeObservationSeries.sampleRateHz + 1e-9),
    );
    const intervalCount = Math.min(maximumIntervalCount, requestedIntervalCount);
    const boundedDurationS = intervalCount / activeObservationSeries.sampleRateHz;
    const samples = createPistonOscillationRecordedObservationSamples(
      activeObservationSeries,
      triggerSourceSampleIndex,
      boundedDurationS,
    );
    const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[
      guideSession.measurementIndex
    ];
    return createPistonOscillationRawMeasurementRecord({
      recordId: `piston-guide-${guideSession.startedAtMs ?? 0}-${guideSession.measurementIndex}`,
      capturedAtMs: Date.now(),
      measurementIndex: guideSession.measurementIndex,
      targetHeightMm,
      confirmedHeightMm: activeTrajectory.equilibrium.equilibriumHeightM * 1_000,
      sampleRateHz: activeObservationSeries.sampleRateHz,
      triggerThresholdKpa: effectiveTriggerKpa,
      recordedDurationS: boundedDurationS,
      samples,
      pressOperationEvidence: activePressOperationEvidence
        ?? createLegacyUnknownPistonOscillationPressOperationEvidence(),
      sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
        sampleRateHz: activeObservationSeries.sampleRateHz,
        triggerSourceSampleIndex,
        observationSeries: activeObservationSeries,
      }),
      physicsSnapshot: createPistonOscillationPhysicsSnapshot(
        activeTrajectory,
        triggerSeconds,
      ),
    });
  }, [
    activeTrajectory,
    activeObservationSeries,
    activePressOperationEvidence,
    effectiveTriggerKpa,
    guideSession,
    triggerSeconds,
    triggerSourceSampleIndex,
  ]);

  const buildFreeCandidate = useCallback((durationS: number) => {
    if (
      !freeSelected
      || !freeSession.experimentPlan
      || freeSession.sampleRateHz === null
      || freeSession.triggerThresholdKpa === null
    ) return null;
    const target = freeSession.experimentPlan.targets[freeSession.measurementIndex];
    const targetHeightMm = target?.heightMm
      ?? freeSession.experimentPlan.targetHeightsMm[freeSession.measurementIndex];
    if (targetHeightMm === undefined) return null;
    const attemptId = freeAttemptIdRef.current
      ?? `${Date.now()}-${Math.floor(performance.now() * 1_000)}`;
    freeAttemptIdRef.current = attemptId;
    if (freeRecordingPath === 'immediate') {
      if (cycleStartMs === null) return null;
      const latestLiveObservation = freeLiveObservationsRef.current.at(-1)
        ?? livePressureObservation;
      const snapshotLockedHeightMm = freeSession.instrumentState.nominalHeightMm;
      let snapshotEquilibrium: ReturnType<
        typeof createPistonOscillationLoadedEquilibriumState
      >;
      try {
        snapshotEquilibrium = createPistonOscillationLoadedEquilibriumState(
          snapshotLockedHeightMm,
        );
      } catch {
        // At the rigid lower stop, the piston cannot create a usable loaded
        // equilibrium or an oscillation record. Keep the stopped acquisition
        // visible, but do not manufacture a savable candidate.
        return null;
      }
      const snapshotVisibleHeightMm = latestLiveObservation?.truePistonHeightMm
        ?? freeSession.instrumentState.thermodynamicState.pistonHeightM * 1_000;
      const snapshotTrajectory = activeTrajectory ?? simulatePistonOscillationRelease({
        lockedHeightMm: snapshotLockedHeightMm,
        initialDisplacementMm: Math.min(
          0,
          snapshotVisibleHeightMm - snapshotEquilibrium.equilibriumHeightM * 1_000,
        ),
      }, {
        sensorSampleRateHz: freeSession.sampleRateHz,
      });
      const observationSampleRateHz = activeObservationSeries?.sampleRateHz
        ?? snapshotTrajectory.sampleRateHz;
      const samples = createPistonOscillationContinuousRecordingSamples({
        durationS,
        sampleRateHz: observationSampleRateHz,
        recordingStartedAtMs: cycleStartMs,
        releaseSegments: freeReleaseSegmentsRef.current,
        pressStartedAtMs: freePressStartedAtMsRef.current,
        liveObservations: freeLiveObservationsRef.current,
      });
      const snapshotObservationSeries =
        createPistonOscillationContinuousObservationSeries({
          samples,
          sampleRateHz: observationSampleRateHz,
          releaseSegments: freeReleaseSegmentsRef.current,
          pressStartedAtMs: freePressStartedAtMsRef.current,
          liveObservations: freeLiveObservationsRef.current,
        });
      const boundedDurationS = samples.at(-1)?.timeS ?? 0;
      if (
        samples.length < 2
        || (
          immediateReleaseOffsetS !== null
          && immediateReleaseOffsetS > boundedDurationS
        )
      ) return null;
      return createPistonOscillationRawMeasurementRecord({
        recordId: `piston-free-${freeSession.startedAtMs ?? 0}-${target?.targetId ?? freeSession.measurementIndex}-${attemptId}`,
        capturedAtMs: Date.now(),
        measurementIndex: freeSession.measurementIndex,
        targetHeightMm,
        confirmedHeightMm: snapshotTrajectory.equilibrium.equilibriumHeightM * 1_000,
        sampleRateHz: snapshotObservationSeries.sampleRateHz,
        triggerThresholdKpa: effectiveTriggerKpa,
        recordedDurationS: boundedDurationS,
        recordingPath: 'immediate',
        releaseOffsetS: immediateReleaseOffsetS,
        samples,
        pressOperationEvidence: activePressOperationEvidence
          ?? createLegacyUnknownPistonOscillationPressOperationEvidence(),
        sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
          sampleRateHz: snapshotObservationSeries.sampleRateHz,
          triggerSourceSampleIndex: 0,
          observationSeries: snapshotObservationSeries,
        }),
        physicsSnapshot: createPistonOscillationPhysicsSnapshot(
          snapshotTrajectory,
          null,
        ),
      });
    }
    if (
      !activeTrajectory
      || !activeObservationSeries
      || cycleStartMs === null
      || triggerSeconds === null
      || triggerSourceSampleIndex === null
    ) return null;
    const samples = createPistonOscillationContinuousRecordingSamples({
      durationS,
      sampleRateHz: activeObservationSeries.sampleRateHz,
      recordingStartedAtMs: cycleStartMs + triggerSeconds * 1_000,
      releaseSegments: freeReleaseSegmentsRef.current,
      pressStartedAtMs: freePressStartedAtMsRef.current,
      liveObservations: freeLiveObservationsRef.current,
    });
    if (samples.length < 2) return null;
    const boundedDurationS = samples.at(-1)?.timeS ?? 0;
    const snapshotObservationSeries =
      createPistonOscillationContinuousObservationSeries({
        samples,
        sampleRateHz: activeObservationSeries.sampleRateHz,
        releaseSegments: freeReleaseSegmentsRef.current,
        pressStartedAtMs: freePressStartedAtMsRef.current,
        liveObservations: freeLiveObservationsRef.current,
      });
    return createPistonOscillationRawMeasurementRecord({
      recordId: `piston-free-${freeSession.startedAtMs ?? 0}-${target?.targetId ?? freeSession.measurementIndex}-${attemptId}`,
      capturedAtMs: Date.now(),
      measurementIndex: freeSession.measurementIndex,
      targetHeightMm,
      confirmedHeightMm: activeTrajectory.equilibrium.equilibriumHeightM * 1_000,
      sampleRateHz: activeObservationSeries.sampleRateHz,
      triggerThresholdKpa: effectiveTriggerKpa,
      recordedDurationS: boundedDurationS,
      recordingPath: 'falling-trigger',
      releaseOffsetS: null,
      samples,
      pressOperationEvidence: activePressOperationEvidence
        ?? createLegacyUnknownPistonOscillationPressOperationEvidence(),
      sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
        sampleRateHz: activeObservationSeries.sampleRateHz,
        triggerSourceSampleIndex,
        observationSeries: snapshotObservationSeries,
      }),
      physicsSnapshot: createPistonOscillationPhysicsSnapshot(
        activeTrajectory,
        triggerSeconds,
      ),
    });
  }, [
    activeObservationSeries,
    activePressOperationEvidence,
    activeTrajectory,
    cycleStartMs,
    effectiveTriggerKpa,
    freeRecordingPath,
    freeSelected,
    freeSession,
    immediateReleaseOffsetS,
    livePressureObservation,
    triggerSeconds,
    triggerSourceSampleIndex,
  ]);

  useEffect(() => {
    if (
      !guideActive
      || guidePaused
      || phase !== 'recording'
      || formalElapsedSeconds < PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S
      || guideRecordingReadyNotifiedRef.current
    ) return;
    const candidate = buildGuideCandidate(PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S);
    if (!candidate || candidate.samples.length < 2) return;
    guideRecordingReadyNotifiedRef.current = true;
    setStopElapsedSeconds(candidate.acquisitionSettings.recordedDurationS);
    const overpressurePeakKpa = guidePendingOverpressurePeakKpaRef.current;
    if (overpressurePeakKpa !== null) {
      guidePendingOverpressurePeakKpaRef.current = null;
      setGuidePressureIssue('overpressure');
      updatePhase('stopped');
      onGuideAcquisitionEvent?.({
        type: 'pressureAttemptRejected',
        reason: 'overpressure',
        peakPressureKpa: overpressurePeakKpa,
      });
      return;
    }
    onGuideAcquisitionEvent?.({ type: 'recordingReady', candidate });
  }, [
    buildGuideCandidate,
    formalElapsedSeconds,
    guideActive,
    guidePaused,
    onGuideAcquisitionEvent,
    phase,
    updatePhase,
  ]);

  const handleStart = () => {
    if (!effectivePowerOn) return;
    if (freeSelected) {
      if (freeCommitRejectedRef.current) {
        freeCommitRejectedRef.current = false;
        return;
      }
      if (!freeAcquisitionParametersValid) {
        showFreeParameterFeedback(copy.acquisitionParametersRequired);
        const sampleRateValid = parsePistonOscillationFreeSampleRate(
          sampleRateInputRef.current?.value ?? sampleRateDraft,
        ) !== null && freeSession.sampleRateHz !== null;
        window.requestAnimationFrame(() => {
          const input = sampleRateValid ? triggerInputRef.current : sampleRateInputRef.current;
          input?.focus();
          input?.select();
        });
        return;
      }
      if (!freeSession.experimentPlan) return;
    }
    const recordingStartedAtMs = performance.now();
    const currentObservation = livePressureObservation ?? {
      sampleClockIndex: Math.floor(recordingStartedAtMs),
      sampledAtMs: recordingStartedAtMs,
      physicalPressurePa: PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
      absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
        PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
      ),
      equilibriumHeightMm: freeSession?.instrumentState.equilibriumHeightMm ?? 0,
      displacementMm: freeSession?.instrumentState.pistonOffsetMm ?? 0,
      truePistonHeightMm:
        (freeSession?.instrumentState.thermodynamicState.pistonHeightM ?? 0) * 1_000,
      temperatureK:
        freeSession?.instrumentState.thermodynamicState.temperatureK ?? 293.15,
      thermodynamicPhase:
        freeSession?.instrumentState.thermodynamicState.phase ?? 'vented',
      sensorState: createInitialPistonOscillationDynamicSensorState(
        PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
      ),
      sensorConfig: { ...DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG },
    };
    const startsImmediately = freeSelected
      && currentObservation.absolutePressureKpa > configuredTriggerKpa;
    if (freeSelected) {
      setFreeRunPressureGraphDomain(adaptiveFreePressureGraphDomain);
    }
    // The scene may still retain the preceding run's release event. Arming
    // establishes a new observation boundary, so only a later release may trigger it.
    handledReleaseEventIdRef.current = releaseEvent?.id ?? null;
    handledPressStartEventIdRef.current = pressStartEvent?.id ?? null;
    setCycleStartMs(startsImmediately ? recordingStartedAtMs : null);
    setTriggerSeconds(startsImmediately ? 0 : null);
    setTriggerSourceSampleIndex(startsImmediately ? 0 : null);
    setFreeRecordingPath(startsImmediately ? 'immediate' : 'falling-trigger');
    setImmediateReleaseOffsetS(null);
    setActiveTrajectory(null);
    setActiveObservationSeries(null);
    setActivePressOperationEvidence(null);
    setStopElapsedSeconds(null);
    setRetained(false);
    setGuidePressureIssue(null);
    frozenFreeCandidateRef.current = null;
    freeReleaseSegmentsRef.current = [];
    freePressStartedAtMsRef.current = [];
    freeLiveObservationsRef.current = startsImmediately
      ? [{ ...currentObservation, sampledAtMs: recordingStartedAtMs }]
      : [];
    setFreeRecordingTimelineRevision((revision) => revision + 1);
    freeAttemptIdRef.current = `${Date.now()}-${Math.floor(recordingStartedAtMs * 1_000)}`;
    if (freeSelected) onFreeCandidateChange?.(null);
    guidePendingOverpressurePeakKpaRef.current = null;
    preTriggerPeakPressureKpaRef.current = livePressureObservation?.absolutePressureKpa
      ?? quantizePistonOscillationObservedPressureKpa(
        PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
      );
    setDisplayNowMs(recordingStartedAtMs);
    updatePhase(startsImmediately ? 'recording' : 'armed');
    if (guideActive) onGuideAcquisitionEvent?.({ type: 'startAcquisition' });
  };

  const handleGuideOverpressureRedo = () => {
    setCycleStartMs(null);
    setTriggerSeconds(null);
    setTriggerSourceSampleIndex(null);
    setFreeRecordingPath('falling-trigger');
    setImmediateReleaseOffsetS(null);
    setActiveTrajectory(null);
    setActiveObservationSeries(null);
    setActivePressOperationEvidence(null);
    setStopElapsedSeconds(null);
    setRetained(false);
    setGuidePressureIssue(null);
    guidePendingOverpressurePeakKpaRef.current = null;
    freeReleaseSegmentsRef.current = [];
    freePressStartedAtMsRef.current = [];
    freeLiveObservationsRef.current = [];
    freeAttemptIdRef.current = null;
    preTriggerPeakPressureKpaRef.current = livePressureObservation?.absolutePressureKpa
      ?? quantizePistonOscillationObservedPressureKpa(
        PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
      );
    guideTriggeredNotifiedRef.current = false;
    guideRecordingReadyNotifiedRef.current = false;
    guidePauseStartedAtMsRef.current = null;
    guideAccumulatedPauseMsRef.current = 0;
    setDisplayNowMs(performance.now());
    updatePhase('armed');
    onGuideAcquisitionEvent?.({ type: 'redoOverpressureAttempt' });
  };

  const handleStop = () => {
    if (!effectivePowerOn) return;
    if (phaseRef.current === 'armed') {
      resetRun();
      return;
    }
    if (
      phaseRef.current !== 'recording'
      && restoredGuidePauseCandidate === null
      && restoredFreeCandidate === null
    ) return;
    const pauseElapsedSeconds = getCurrentRecordingElapsedSeconds();
    const candidate = restoredGuidePauseCandidate ?? buildGuideCandidate(pauseElapsedSeconds);
    const effectiveCandidate = guideSelected
      ? candidate
      : restoredFreeCandidate ?? buildFreeCandidate(pauseElapsedSeconds);
    if (guideActive && candidate) {
      onGuideAcquisitionEvent?.({ type: 'curvePaused', candidate });
    }
    if (freeSelected && effectiveCandidate) {
      frozenFreeCandidateRef.current = effectiveCandidate;
      onFreeCandidateChange?.(effectiveCandidate);
    }
    setStopElapsedSeconds(
      effectiveCandidate?.acquisitionSettings.recordedDurationS
        ?? pauseElapsedSeconds,
    );
    updatePhase('stopped');
  };

  useImperativeHandle(ref, () => ({
    pauseAndCaptureFreeRun: () => {
      if (!freeSelected) return null;
      const existingCandidate = restoredFreeCandidate ?? frozenFreeCandidateRef.current;
      if (existingCandidate) return existingCandidate;
      if (phaseRef.current !== 'recording') return null;
      const candidate = buildFreeCandidate(getCurrentRecordingElapsedSeconds());
      if (!candidate) return null;
      frozenFreeCandidateRef.current = candidate;
      setStopElapsedSeconds(candidate.acquisitionSettings.recordedDurationS);
      updatePhase('stopped');
      return candidate;
    },
  }), [
    buildFreeCandidate,
    formalElapsedSeconds,
    freeSelected,
    restoredFreeCandidate,
    updatePhase,
  ]);

  const acquisitionActive = effectivePhase === 'armed' || effectivePhase === 'recording';
  const effectiveRetained = retained || restoredGuideSavedMeasurement !== null;
  const freeSaveCandidateAvailable = Boolean(
    restoredFreeCandidate ?? frozenFreeCandidateRef.current,
  );
  const measurementNumber = demoFrame
    ? demoFrame.measurementIndex + 1
    : guideSelected
      ? (guideSession?.measurementIndex ?? 0) + 1
      : freeSelected
        ? Math.min(
            freeSession.experimentPlan?.targetHeightsMm.length ?? 0,
            freeSession.measurementIndex + 1,
          )
        : 1;
  const totalMeasurements = demoFrame
    ? demoFrame.measurementCount
    : guideSelected
    ? PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS
    : freeSelected
      ? freeSession.experimentPlan?.targetHeightsMm.length ?? 0
      : PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS;
  const guideFeedback = guideSession?.feedbackCode === 'sampleRateInvalid'
    ? getPistonOscillationShellCopy(language).guide.sampleRateInvalid
    : guideSession?.feedbackCode === 'triggerThresholdInvalid'
      ? getPistonOscillationShellCopy(language).guide.triggerThresholdInvalid
      : null;
  const guideInputsLocked = Boolean(
    guideSelected && (guideSession.parametersLocked || guidePaused),
  );
  const guidePrimaryAllowed = !guideSelected || (
    guideActive
    && (
      (phase === 'idle' && guideSession.step === 'acquisitionReady')
      || (
        effectivePhase === 'recording'
        && guideSession.step === 'pauseAvailable'
        && guidePauseReady
      )
    )
  );
  const guideSaveAllowed = Boolean(
    guideActive
    && effectivePhase === 'stopped'
    && guideSession.step === 'awaitingSaveOrRedo'
    && !effectiveRetained,
  );
  const commitGuideParameter = (field: PistonOscillationGuideParameterField) => {
    if (!guideInputsLocked) onGuideParameterCommit?.(field);
  };
  const commitFreeParameter = (
    field: 'sampleRateHz' | 'triggerThresholdKpa',
  ): boolean => {
    if (!freeSelected) return false;
    const draft = field === 'sampleRateHz' ? sampleRateDraft : triggerDraft;
    const value = field === 'sampleRateHz'
      ? parsePistonOscillationFreeSampleRate(draft)
      : parsePistonOscillationFreeTriggerThreshold(draft);
    if (value === null) {
      freeCommitRejectedRef.current = true;
      if (field === 'sampleRateHz') {
        setSampleRateDraft(
          freeSession.sampleRateHz === null ? '' : String(freeSession.sampleRateHz),
        );
        showFreeParameterFeedback(copy.sampleRateRangeWarning);
      } else {
        setTriggerDraft(
          freeSession.triggerThresholdKpa === null
            ? ''
            : String(freeSession.triggerThresholdKpa),
        );
        showFreeParameterFeedback(copy.triggerThresholdRangeWarning);
      }
      return false;
    }
    freeCommitRejectedRef.current = false;
    if (field === 'sampleRateHz') {
      setSampleRateDraft(String(value));
    } else {
      setTriggerDraft(String(value));
    }
    onFreeAcquisitionSettingCommit?.(field, value);
    return true;
  };
  const restoreFreeParameterDraft = (field: 'sampleRateHz' | 'triggerThresholdKpa') => {
    if (!freeSelected) return;
    if (field === 'sampleRateHz') {
      setSampleRateDraft(
        freeSession.sampleRateHz === null ? '' : String(freeSession.sampleRateHz),
      );
    } else {
      setTriggerDraft(
        freeSession.triggerThresholdKpa === null ? '' : String(freeSession.triggerThresholdKpa),
      );
    }
  };

  if (!effectivePowerOn) {
    return (
      <aside
        className="piston-acquisition-panel is-powered-off"
        data-piston-acquisition-preview="true"
        data-piston-power="off"
      >
        <div className="piston-acquisition-power-off-state" role="status">
          <strong>{copy.powerOff}</strong>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="piston-acquisition-panel"
      data-piston-acquisition-preview="true"
      data-acquisition-phase={effectivePhase}
      data-free-recording-path={
        restoredFreeCandidate?.acquisitionSettings.recordingPath
          ?? freeRecordingPath
      }
      data-acquisition-sample-count={sampleCount}
      data-piston-demo-active={demoActive ? 'true' : 'false'}
      data-piston-demo-control={demoFrame?.activeControl ?? 'none'}
      data-piston-demo-highlight={demoFrame?.highlightControl ?? 'none'}
      data-piston-demo-stage={demoFrame?.stage ?? 'none'}
      data-piston-guide-status={guideSession?.status ?? 'idle'}
      data-piston-guide-cue={guideCue ?? 'none'}
      data-piston-power="on"
    >
      <div className="piston-acquisition-panel-heading">
        <strong className="piston-acquisition-title">{copy.title}</strong>
        <div className="piston-acquisition-run-summary">
          <span>{copy.measurement(measurementNumber, totalMeasurements)}</span>
          <span className={`piston-acquisition-phase is-${effectivePhase}`}>
            {guideSession?.step === 'powerOff'
              ? copy.acquisitionComplete
              : copy.phases[effectivePhase]}
          </span>
        </div>
      </div>

      <div
        className={`piston-acquisition-settings ${
          demoFrame?.highlightControl === 'settings' ? 'is-demo-highlighted' : ''
        } ${guideParameterSetupActive ? 'is-guide-highlighted' : ''
        } ${guideRejectedControl === 'settings' ? 'is-guide-rejected' : ''}`.trim()}
        data-piston-demo-highlight-target={
          demoFrame?.highlightControl === 'settings' ? 'settings' : undefined
        }
      >
        <label className={
          demoFrame?.virtualKeyboardField === 'sampleRate'
            ? 'is-demo-keyboard-active'
            : undefined
        }>
          <span>{copy.sampleRate}</span>
          <div>
            <input
              ref={sampleRateInputRef}
              type="number"
              min={PISTON_OSCILLATION_FREE_SAMPLE_RATE_MIN_HZ}
              max={PISTON_OSCILLATION_FREE_SAMPLE_RATE_MAX_HZ}
              step={1}
              value={demoFrame?.sampleRateInput
                ?? (guideSelected ? guideSession.parameterDrafts.sampleRateHz : sampleRateDraft)}
              readOnly={demoActive || guideInputsLocked}
              disabled={!demoActive && !guideActive && (phase === 'armed' || phase === 'recording')}
              aria-invalid={guideSession?.parameterStatus.sampleRateHz === 'invalid'
                || (freeSelected
                  && sampleRateDraft.trim().length > 0
                  && parsePistonOscillationFreeSampleRate(sampleRateDraft) === null)}
              onPointerDown={() => {
                if (guideSelected && guideInputsLocked && !guidePaused) {
                  attemptGuideAction('editParameters', 'settings');
                }
              }}
              onChange={(event) => {
                if (guideSelected && !guidePaused) {
                  onGuideParameterEdit?.('sampleRateHz', event.target.value);
                } else if (!demoActive) {
                  setSampleRateDraft(event.target.value);
                }
              }}
              onBlur={() => {
                if (guideSelected && !guidePaused) {
                  commitGuideParameter('sampleRateHz');
                } else if (freeSelected) {
                  commitFreeParameter('sampleRateHz');
                }
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (freeSelected) {
                    const accepted = commitFreeParameter('sampleRateHz');
                    if (accepted) triggerInputRef.current?.focus();
                  } else {
                    event.currentTarget.blur();
                  }
                } else if (event.key === 'Escape' && freeSelected) {
                  event.preventDefault();
                  restoreFreeParameterDraft('sampleRateHz');
                }
              }}
            />
            <small>Hz</small>
          </div>
        </label>
        <label className={
          demoFrame?.virtualKeyboardField === 'trigger'
            ? 'is-demo-keyboard-active'
            : undefined
        }>
          <span>{copy.triggerThreshold}</span>
          <div>
            <input
              ref={triggerInputRef}
              type="number"
              min={PISTON_OSCILLATION_FREE_TRIGGER_MIN_KPA}
              max={guideSelected || demoActive
                ? 140
                : PISTON_OSCILLATION_FREE_TRIGGER_MAX_KPA}
              step={0.1}
              value={demoFrame?.triggerInput
                ?? (guideSelected ? guideSession.parameterDrafts.triggerThresholdKpa : triggerDraft)}
              readOnly={demoActive || guideInputsLocked}
              disabled={!demoActive && !guideActive && (phase === 'armed' || phase === 'recording')}
              aria-invalid={guideSession?.parameterStatus.triggerThresholdKpa === 'invalid'
                || (freeSelected
                  && triggerDraft.trim().length > 0
                  && parsePistonOscillationFreeTriggerThreshold(triggerDraft) === null)}
              onPointerDown={() => {
                if (guideSelected && guideInputsLocked && !guidePaused) {
                  attemptGuideAction('editParameters', 'settings');
                }
              }}
              onChange={(event) => {
                if (guideSelected && !guidePaused) {
                  onGuideParameterEdit?.('triggerThresholdKpa', event.target.value);
                } else if (!demoActive) {
                  setTriggerDraft(event.target.value);
                }
              }}
              onBlur={() => {
                if (guideSelected && !guidePaused) {
                  commitGuideParameter('triggerThresholdKpa');
                } else if (freeSelected) {
                  commitFreeParameter('triggerThresholdKpa');
                }
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === 'Escape' && freeSelected) {
                  event.preventDefault();
                  restoreFreeParameterDraft('triggerThresholdKpa');
                }
              }}
            />
            <small>kPa</small>
          </div>
        </label>
      </div>

      {demoFrame?.virtualKeyboardVisible ? (
        <div
          className="piston-demo-virtual-keyboard"
          data-piston-demo-virtual-keyboard="true"
          data-piston-demo-keyboard-field={demoFrame.virtualKeyboardField ?? 'none'}
          role="group"
          aria-label={copy.virtualKeyboard}
        >
          <div className="piston-demo-virtual-keyboard-heading">
            <strong>{copy.virtualKeyboard}</strong>
            <span>
              {demoFrame.virtualKeyboardField === 'sampleRate'
                ? copy.sampleRate
                : copy.triggerThreshold}
            </span>
          </div>
          <div className="piston-demo-virtual-keyboard-grid" aria-hidden="true">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
              <span
                key={key}
                className={demoFrame.virtualKeyboardPressedKey === key ? 'is-pressed' : undefined}
                data-piston-demo-key={key}
              >
                {key}
              </span>
            ))}
            <span
              className="is-function-key"
              data-piston-demo-key="backspace"
              title={copy.keyboardBackspace}
            >
              ←
            </span>
            <span
              className={demoFrame.virtualKeyboardPressedKey === '0' ? 'is-pressed' : undefined}
              data-piston-demo-key="0"
            >
              0
            </span>
            <span
              className={`is-function-key ${
                demoFrame.virtualKeyboardPressedKey === 'action' ? 'is-pressed' : ''
              }`.trim()}
              data-piston-demo-key="action"
            >
              {demoFrame.virtualKeyboardField === 'sampleRate'
                ? copy.keyboardNext
                : copy.keyboardConfirm}
            </span>
          </div>
        </div>
      ) : null}

      {guideFeedback || freeParameterFeedback ? (
        <div
          key={guideFeedback
            ? `${guideSession?.feedbackCode}:${guideSession?.updatedAtMs}`
            : freeParameterFeedback}
          className="piston-guide-parameter-feedback"
          data-prompt-feedback-kind="warning"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{guideFeedback ?? freeParameterFeedback}</strong>
        </div>
      ) : null}
      <div className="piston-acquisition-live-readout">
        <div>
          <span>{copy.absolutePressure}</span>
          <strong>{formatPistonOscillationObservedPressureKpa(currentPressureKpa)} <small>kPa</small></strong>
        </div>
        <div>
          <span>{copy.formalSamples}</span>
          <strong>{sampleCount.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')} <small>{copy.pointsUnit}</small></strong>
        </div>
        <div>
          <span>{copy.recordingTime}</span>
          <strong>{formalElapsedSeconds.toFixed(3)} <small>s</small></strong>
        </div>
      </div>

      <div ref={chartWrapRef} className="piston-acquisition-chart-wrap">
        <div className="piston-acquisition-chart-viewport">
          <svg viewBox={`0 0 ${graphWidth} ${GRAPH_HEIGHT}`} role="img" aria-label={copy.curveAria}>
          <rect
            x={GRAPH_LEFT}
            y={GRAPH_TOP}
            width={graphRight - GRAPH_LEFT}
            height={GRAPH_BOTTOM - GRAPH_TOP}
            className="piston-acquisition-chart-bg"
          />
          {pressureGraphDomain.ticksKpa.map((pressure) => {
            const y = pressureToY(pressure, pressureGraphDomain);
            return (
              <g key={pressure.toFixed(4)}>
                <line x1={GRAPH_LEFT} x2={graphRight} y1={y} y2={y} className="piston-acquisition-grid-line" />
                <text x={GRAPH_LEFT - 10} y={y + 4} textAnchor="end">
                  {pressure.toFixed(2)}
                </text>
              </g>
            );
          })}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const x = GRAPH_LEFT + ratio * (graphRight - GRAPH_LEFT);
            return (
              <g key={ratio}>
                <line x1={x} x2={x} y1={GRAPH_TOP} y2={GRAPH_BOTTOM} className="piston-acquisition-grid-line" />
                <text x={x} y={GRAPH_BOTTOM + 22} textAnchor="middle">
                  {(ratio * graphDomainSeconds).toFixed(3)}
                </text>
              </g>
            );
          })}
          {triggerValueVisible ? (
            <>
              <line
                x1={GRAPH_LEFT}
                x2={graphRight}
                y1={triggerY}
                y2={triggerY}
                className="piston-acquisition-trigger-line"
              />
              <text x={graphRight - 4} y={triggerY - 7} textAnchor="end" className="piston-acquisition-trigger-label">
                {copy.triggerLine(effectiveTriggerKpa)}
              </text>
            </>
          ) : null}
          {guideSelected || demoActive ? (
            <>
              <line
                x1={GRAPH_LEFT}
                x2={graphRight}
                y1={qualityUpperY}
                y2={qualityUpperY}
                className="piston-acquisition-quality-upper-line"
              />
              <text
                x={graphRight - 4}
                y={qualityUpperY + 13}
                textAnchor="end"
                className="piston-acquisition-quality-upper-label"
              >
                {copy.qualityUpperLine(PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA)}
              </text>
            </>
          ) : null}
          {pressurePath ? <path d={pressurePath} className="piston-acquisition-pressure-path" /> : null}
          {pressureSampleMarkerPath ? (
            <path
              d={pressureSampleMarkerPath}
              className="piston-acquisition-pressure-sample-markers"
              aria-hidden="true"
            />
          ) : null}
          <rect
            x={GRAPH_LEFT}
            y={GRAPH_TOP}
            width={graphRight - GRAPH_LEFT}
            height={GRAPH_BOTTOM - GRAPH_TOP}
            className="piston-acquisition-plot-frame"
          />
          {pressureIndicatorVisible ? (
            <circle
              cx={GRAPH_LEFT}
              cy={pressureIndicatorY}
              r="5"
              className={`piston-acquisition-pressure-indicator is-${pressureIndicatorState}`}
              data-piston-pressure-indicator={pressureIndicatorState}
            >
              <title>{copy.pressureIndicator(currentPressureKpa)}</title>
            </circle>
          ) : null}
          <text x="18" y="179" transform="rotate(-90 18 179)" textAnchor="middle" className="piston-acquisition-axis-label">
            {copy.pressureAxis}
          </text>
          {!pressurePath ? (
            <text x={graphCenterX} y="179" textAnchor="middle" className="piston-acquisition-empty-label">
              {effectivePhase === 'armed' ? copy.waitingTrigger : copy.emptyCurve}
            </text>
          ) : null}
          </svg>
        </div>
        <div className="piston-acquisition-chart-footer">
          <div
            className="piston-chart-action-strip piston-acquisition-actions"
            role="group"
            aria-label={copy.actionsAria}
          >
          <button
            type="button"
            data-piston-acquisition-action="primary"
            className={`is-primary ${
              demoFrame?.highlightControl === 'start' || demoFrame?.highlightControl === 'stop'
                ? 'is-demo-highlighted'
                : ''
            } ${
              guideCue === 'start' || guideCue === 'pause'
                ? 'is-guide-highlighted'
                : ''
            } ${
              demoFrame?.activeControl === 'start' || demoFrame?.activeControl === 'stop'
                ? 'is-demo-pressed'
                : ''
            } ${guideRejectedControl === 'primary' ? 'is-guide-rejected' : ''}`.trim()}
            data-piston-demo-highlight-target={
              demoFrame?.highlightControl === 'start' || demoFrame?.highlightControl === 'stop'
                ? demoFrame.highlightControl
                : undefined
            }
            data-piston-guide-target="primary"
            aria-label={acquisitionActive ? copy.pause : copy.start}
            title={acquisitionActive ? copy.pause : copy.start}
            onClick={() => {
              if (demoActive || guidePaused) return;
              if (guideSelected && !attemptGuideAction(
                acquisitionActive ? 'pauseAcquisition' : 'startAcquisition',
                'primary',
              )) return;
              (acquisitionActive ? handleStop : handleStart)();
            }}
            disabled={demoActive || guidePaused || guidePressureIssue === 'overpressure'}
            aria-disabled={
              demoActive
              || guidePaused
              || guidePressureIssue === 'overpressure'
              || !guidePrimaryAllowed
            }
          >
            <span className="piston-acquisition-action-feedback" aria-hidden="true">
              {acquisitionActive ? (
                <Square size={13} strokeWidth={2.3} fill="currentColor" aria-hidden="true" />
              ) : (
                <Play size={14} strokeWidth={2.3} fill="currentColor" aria-hidden="true" />
              )}
            </span>
          </button>
          <button
            type="button"
            data-piston-acquisition-action="redo"
            data-piston-guide-target="redo"
            aria-label={copy.redo}
            title={copy.redo}
            className={guideCue === 'redo' ? 'is-guide-highlighted' : undefined}
            onClick={() => {
              if (demoActive || guidePaused) return;
              if (guideSelected && guidePressureIssue === 'overpressure') {
                handleGuideOverpressureRedo();
                return;
              }
              if (!guideSelected) {
                if (freeSelected) onFreeCandidateChange?.(null);
                resetRun();
              }
            }}
            disabled={demoActive || guidePaused || (
              guideSelected
                ? guidePressureIssue !== 'overpressure'
                : phase === 'idle'
            )}
            aria-disabled={demoActive || guidePaused || (
              guideSelected
                ? guidePressureIssue !== 'overpressure'
                : phase === 'idle'
            )}
          >
            <span className="piston-acquisition-action-feedback" aria-hidden="true">
              <RotateCcw size={14} strokeWidth={2.3} aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            data-piston-acquisition-action="save"
            aria-label={copy.save}
            title={copy.save}
            className={`${
              demoFrame?.highlightControl === 'retain' ? 'is-demo-highlighted' : ''
            } ${guideCue === 'save' ? 'is-guide-highlighted' : ''
            } ${demoFrame?.activeControl === 'retain' ? 'is-demo-pressed' : ''
            } ${guideRejectedControl === 'save' ? 'is-guide-rejected' : ''}`.trim()}
            data-piston-demo-highlight-target={
              demoFrame?.highlightControl === 'retain' ? 'retain' : undefined
            }
            data-piston-guide-target="save"
            onClick={() => {
              if (!demoActive && !effectiveRetained) {
                if (guideSelected && !attemptGuideAction('saveMeasurement', 'save')) return;
                setRetained(true);
                if (guideActive) {
                  onGuideAcquisitionEvent?.({ type: 'saveMeasurement' });
                }
                if (freeSelected) {
                  const candidate = restoredFreeCandidate
                    ?? frozenFreeCandidateRef.current;
                  if (!candidate) return;
                  onFreeMeasurementSave?.(candidate);
                }
                onRunRetained?.();
              }
            }}
            disabled={demoActive || guidePaused || (!guideSelected && (
              effectivePhase !== 'stopped'
              || effectiveRetained
              || !freeSaveCandidateAvailable
            ))}
            aria-disabled={demoActive || guidePaused || (
              guideSelected
                ? !guideSaveAllowed
                : effectivePhase !== 'stopped'
                  || effectiveRetained
                  || !freeSaveCandidateAvailable
            )}
          >
            <span className="piston-acquisition-action-feedback" aria-hidden="true">
              <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            </span>
          </button>
          </div>
          <span className="piston-acquisition-axis-footer-label">{copy.timeAxis}</span>
        </div>
      </div>

      <div className="piston-acquisition-note">
        <span>{(
          restoredFreeCandidate?.acquisitionSettings.recordingPath
            ?? freeRecordingPath
        ) === 'immediate'
          ? copy.immediateRecordingNote
          : copy.preTriggerNote}</span>
        {demoFrame?.retainFeedbackVisible ? (
          <strong>{copy.demoSaved}</strong>
        ) : effectiveRetained ? <strong>{copy.saved}</strong> : null}
      </div>

    </aside>
  );
});

PistonOscillationAcquisitionPanel.displayName = 'PistonOscillationAcquisitionPanel';

export default PistonOscillationAcquisitionPanel;
