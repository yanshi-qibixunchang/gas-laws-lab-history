import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Play, RotateCcw, Square } from 'lucide-react';
import {
  type PistonOscillationTrajectory,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  createPistonOscillationSensorObservationSnapshot,
} from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationRecordedObservationSamples,
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
  findPistonAcquisitionFallingTriggerSeconds,
  getPistonAcquisitionPresetPressureKpa,
} from './pistonOscillationPresetAcquisition.ts';
import type { PistonOscillationDemoFrame } from './pistonOscillationDemoTimeline.ts';
import type {
  PistonOscillationGuideAction,
  PistonOscillationGuideActionContext,
  PistonOscillationGuideGuardResult,
  PistonOscillationGuideParameterField,
  PistonOscillationGuideSavedMeasurement,
  PistonOscillationGuideSession,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S,
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  getPistonOscillationShellCopy,
  type PistonOscillationLanguage,
} from './pistonOscillationCopy.ts';
import './PistonOscillationAcquisitionPanel.css';

type AcquisitionPhase = 'idle' | 'armed' | 'recording' | 'stopped';

export type PistonOscillationGuideAcquisitionCue =
  | 'settings'
  | 'start'
  | 'pause'
  | 'save'
  | null;

export type PistonOscillationGuideAcquisitionEvent =
  | { type: 'startAcquisition' }
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
  trajectory?: PistonOscillationTrajectory;
}

const GRAPH_DEFAULT_WIDTH = 860;
const GRAPH_HEIGHT = 380;
const GRAPH_LEFT = 64;
const GRAPH_RIGHT_MARGIN = 24;
const GRAPH_TOP = 24;
const GRAPH_BOTTOM = 334;
const GRAPH_MIN_PRESSURE_KPA = 96;
const GRAPH_MAX_PRESSURE_KPA = 109;

interface PressureGraphDomain {
  minimumKpa: number;
  maximumKpa: number;
  ticksKpa: readonly number[];
}

const DEFAULT_PRESSURE_GRAPH_DOMAIN: PressureGraphDomain = {
  minimumKpa: GRAPH_MIN_PRESSURE_KPA,
  maximumKpa: GRAPH_MAX_PRESSURE_KPA,
  ticksKpa: [96, 99, 102, 105, 108],
};

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

export const PistonOscillationAcquisitionPanel = ({
  language,
  releaseEvent,
  demoFrame,
  guideSession,
  onGuideParameterEdit,
  onGuideParameterCommit,
  guidePaused = false,
  guideCue = null,
  onGuideAcquisitionEvent,
  onGuideActionAttempt,
  onRunRetained,
}: {
  language: PistonOscillationLanguage;
  releaseEvent: PistonOscillationReleaseEvent | null;
  demoFrame?: PistonOscillationDemoFrame;
  guideSession?: PistonOscillationGuideSession;
  onGuideParameterEdit?: (
    field: PistonOscillationGuideParameterField,
    value: string,
  ) => void;
  onGuideParameterCommit?: (field: PistonOscillationGuideParameterField) => void;
  guidePaused?: boolean;
  guideCue?: PistonOscillationGuideAcquisitionCue;
  onGuideAcquisitionEvent?: (event: PistonOscillationGuideAcquisitionEvent) => void;
  onGuideActionAttempt?: (
    action: PistonOscillationGuideAction,
    context: PistonOscillationGuideActionContext,
  ) => PistonOscillationGuideGuardResult;
  onRunRetained?: () => void;
}) => {
  const copy = getPistonOscillationShellCopy(language).acquisition;
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
  const [sampleRateHz, setSampleRateHz] = useState(
    PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
  );
  const [triggerKpa, setTriggerKpa] = useState(
    PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  );
  const [cycleStartMs, setCycleStartMs] = useState<number | null>(null);
  const [triggerSeconds, setTriggerSeconds] = useState<number | null>(null);
  const [triggerSourceSampleIndex, setTriggerSourceSampleIndex] = useState<number | null>(null);
  const [activeTrajectory, setActiveTrajectory] =
    useState<PistonOscillationTrajectory | null>(null);
  const [displayNowMs, setDisplayNowMs] = useState(() => performance.now());
  const [stopElapsedSeconds, setStopElapsedSeconds] = useState<number | null>(null);
  const [retained, setRetained] = useState(false);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [graphWidth, setGraphWidth] = useState(GRAPH_DEFAULT_WIDTH);
  const guideSelected = guideSession?.status === 'active'
    || guideSession?.status === 'completed';
  const guideActive = guideSession?.status === 'active';
  const guideSessionStartedAtMs = guideSession === undefined
    ? undefined
    : guideSession.startedAtMs;
  const guideMeasurementIndex = guideSession?.measurementIndex;
  const guideParameterSetupActive = guideActive
    && guideSession.step === 'parameterSetup'
    && guideCue === 'settings';
  const guideTriggeredNotifiedRef = useRef(false);
  const guideRecordingReadyNotifiedRef = useRef(false);
  const guidePauseStartedAtMsRef = useRef<number | null>(null);
  const guideAccumulatedPauseMsRef = useRef(0);
  const previousGuideMeasurementIndexRef = useRef(guideMeasurementIndex);

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
    setActiveTrajectory(null);
    setStopElapsedSeconds(null);
    setRetained(false);
    setDisplayNowMs(performance.now());
    guideTriggeredNotifiedRef.current = false;
    guideRecordingReadyNotifiedRef.current = false;
    guidePauseStartedAtMsRef.current = null;
    guideAccumulatedPauseMsRef.current = 0;
  }, [updatePhase]);

  useEffect(() => {
    if (guideSessionStartedAtMs === undefined) return;
    resetRun();
  }, [guideSessionStartedAtMs, resetRun]);

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
    if (!releaseEvent || phaseRef.current !== 'armed') return;
    const nextTrajectory = releaseEvent.trajectory ?? null;
    const nextObservationSeries = nextTrajectory
      ? createPistonOscillationSensorObservationSeries(
        nextTrajectory.samples,
        nextTrajectory.sampleRateHz,
      )
      : null;
    const nextTriggerSample = nextObservationSeries
      ? findPistonOscillationObservedFallingTriggerSample(
        nextObservationSeries,
        triggerKpa,
      )
      : null;
    const nextTriggerSeconds = nextObservationSeries
      ? nextTriggerSample?.timeS ?? null
      : findPistonAcquisitionFallingTriggerSeconds(triggerKpa, sampleRateHz);
    setActiveTrajectory(nextTrajectory);
    setCycleStartMs(releaseEvent.startedAtMs);
    setTriggerSeconds(nextTriggerSeconds);
    setTriggerSourceSampleIndex(nextTriggerSample?.sampleIndex ?? null);
    setDisplayNowMs(performance.now());
    guideTriggeredNotifiedRef.current = false;
    guideRecordingReadyNotifiedRef.current = false;
    guidePauseStartedAtMsRef.current = null;
    guideAccumulatedPauseMsRef.current = 0;
  }, [releaseEvent, sampleRateHz, triggerKpa]);

  useEffect(() => {
    if (
      cycleStartMs === null
      || guidePaused
      || (phase !== 'armed' && phase !== 'recording')
    ) return;
    let frame = 0;
    const animate = (nowMs: number) => {
      setDisplayNowMs(nowMs);
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
  const restoredGuideCandidate = !demoFrame
    && phase === 'idle'
    && (guideSession?.step === 'curveFrozen' || guideSession?.step === 'awaitingSaveOrRedo')
    ? guideSession.acquisitionCandidate
    : null;
  const restoredGuideSavedMeasurement = !demoFrame
    && phase === 'idle'
    && guideSession?.status === 'completed'
    ? guideSession.savedMeasurements.find(
        (measurement) => measurement.measurementIndex === guideSession.measurementIndex,
      ) ?? null
    : null;
  const restoredGuideMeasurement = restoredGuideCandidate ?? restoredGuideSavedMeasurement;
  const demoActive = demoFrame !== undefined;
  const effectivePhase = demoFrame?.acquisitionPhase
    ?? (restoredGuideMeasurement ? 'stopped' : phase);
  const effectiveSampleRateHz = demoFrame
    ? Number(demoFrame.sampleRateInput) || PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ
    : restoredGuideMeasurement?.acquisitionSettings.sampleRateHz ?? sampleRateHz;
  const effectiveTriggerKpa = demoFrame
    ? Number(demoFrame.triggerInput) || PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA
    : restoredGuideMeasurement?.acquisitionSettings.triggerThresholdKpa ?? triggerKpa;
  const effectiveTriggerSeconds = demoFrame
    ? findPistonAcquisitionFallingTriggerSeconds(
      PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
      PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
    )
    : restoredGuideMeasurement ? 0 : triggerSeconds;
  const elapsedSinceReleaseSeconds = restoredGuideMeasurement
    ?.acquisitionSettings.recordedDurationS
    ?? demoFrame?.releaseElapsedSeconds
    ?? localElapsedSinceReleaseSeconds;
  const formalElapsedSeconds = restoredGuideMeasurement
    ?.acquisitionSettings.recordedDurationS
    ?? demoFrame?.formalElapsedSeconds
    ?? localFormalElapsedSeconds;
  const graphMinimumDomainSeconds = guideSelected
    ? PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S
    : 0.8;
  const activeObservationSeries = useMemo<PistonOscillationSensorObservationSeries | null>(
    () => !demoFrame && activeTrajectory
      ? createPistonOscillationSensorObservationSeries(
        activeTrajectory.samples,
        activeTrajectory.sampleRateHz,
      )
      : null,
    [activeTrajectory, demoFrame],
  );
  const displayedObservationSamples = useMemo<PistonOscillationObservedSample[]>(() => {
    if (restoredGuideMeasurement) return restoredGuideMeasurement.samples;
    if (formalElapsedSeconds <= 0 || effectiveTriggerSeconds === null) return [];
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
    const intervalCount = Math.max(
      0,
      Math.floor(formalElapsedSeconds * effectiveSampleRateHz + 1e-9),
    );
    return Array.from({ length: intervalCount + 1 }, (_, sampleIndex) => {
      const timeS = getPistonOscillationObservedTimeS(sampleIndex, effectiveSampleRateHz);
      return {
        sampleIndex,
        timeS,
        absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
          getPistonAcquisitionPresetPressureKpa(effectiveTriggerSeconds + timeS) * 1_000,
        ),
      };
    });
  }, [
    activeObservationSeries,
    effectiveSampleRateHz,
    effectiveTriggerSeconds,
    formalElapsedSeconds,
    restoredGuideMeasurement,
    triggerSourceSampleIndex,
  ]);
  const getEffectivePressureKpa = useCallback((secondsSinceRelease: number) => {
    if (restoredGuideMeasurement) {
      return getObservedPressureKpa(
        restoredGuideMeasurement.samples,
        secondsSinceRelease,
        restoredGuideMeasurement.acquisitionSettings.sampleRateHz,
      );
    }
    if (activeObservationSeries) {
      return getObservedPressureKpa(
        activeObservationSeries.samples,
        secondsSinceRelease,
        activeObservationSeries.sampleRateHz,
      );
    }
    return quantizePistonOscillationObservedPressureKpa(
      getPistonAcquisitionPresetPressureKpa(secondsSinceRelease) * 1_000,
    );
  }, [activeObservationSeries, restoredGuideMeasurement]);
  const currentPressureKpa = elapsedSinceReleaseSeconds === null
    ? quantizePistonOscillationObservedPressureKpa(
      PISTON_ACQUISITION_BASELINE_PRESSURE_KPA * 1_000,
    )
    : getEffectivePressureKpa(elapsedSinceReleaseSeconds);
  const sampleCount = effectivePhase === 'idle' || effectivePhase === 'armed'
    ? 0
    : displayedObservationSamples.length;
  const graphRight = graphWidth - GRAPH_RIGHT_MARGIN;
  const graphCenterX = (GRAPH_LEFT + graphRight) / 2;
  const pressureGraphDomain = useMemo(
    () => restoredGuideMeasurement
      ? getRecordedPressureGraphDomain(restoredGuideMeasurement)
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
        : DEFAULT_PRESSURE_GRAPH_DOMAIN,
    [
      activeObservationSeries,
      graphMinimumDomainSeconds,
      restoredGuideMeasurement,
      triggerSourceSampleIndex,
    ],
  );
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
  const triggerValueVisible = !demoFrame || demoFrame.triggerInput.length > 0;

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
      sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
        sampleRateHz: activeObservationSeries.sampleRateHz,
        triggerSourceSampleIndex,
      }),
      physicsSnapshot: createPistonOscillationPhysicsSnapshot(
        activeTrajectory,
        triggerSeconds,
      ),
    });
  }, [
    activeTrajectory,
    activeObservationSeries,
    effectiveTriggerKpa,
    guideSession,
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
    onGuideAcquisitionEvent?.({ type: 'recordingReady', candidate });
  }, [
    buildGuideCandidate,
    formalElapsedSeconds,
    guideActive,
    guidePaused,
    onGuideAcquisitionEvent,
    phase,
  ]);

  const handleStart = () => {
    setCycleStartMs(null);
    setTriggerSeconds(null);
    setTriggerSourceSampleIndex(null);
    setActiveTrajectory(null);
    setStopElapsedSeconds(null);
    setRetained(false);
    updatePhase('armed');
    if (guideActive) onGuideAcquisitionEvent?.({ type: 'startAcquisition' });
  };

  const handleStop = () => {
    if (phaseRef.current === 'armed') {
      resetRun();
      return;
    }
    if (phaseRef.current !== 'recording') return;
    const candidate = buildGuideCandidate(formalElapsedSeconds);
    if (guideActive && candidate) {
      onGuideAcquisitionEvent?.({ type: 'curvePaused', candidate });
    }
    setStopElapsedSeconds(formalElapsedSeconds);
    updatePhase('stopped');
  };

  const acquisitionActive = effectivePhase === 'armed' || effectivePhase === 'recording';
  const effectiveRetained = retained || restoredGuideSavedMeasurement !== null;
  const measurementNumber = (guideSession?.measurementIndex ?? 0) + 1;
  const totalMeasurements = guideSelected
    ? PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS
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
      || (phase === 'recording' && guideSession.step === 'pauseAvailable')
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

  return (
    <aside
      className="piston-acquisition-panel"
      data-piston-acquisition-preview="true"
      data-acquisition-phase={effectivePhase}
      data-acquisition-sample-count={sampleCount}
      data-piston-demo-active={demoActive ? 'true' : 'false'}
      data-piston-demo-control={demoFrame?.activeControl ?? 'none'}
      data-piston-demo-highlight={demoFrame?.highlightControl ?? 'none'}
      data-piston-demo-stage={demoFrame?.stage ?? 'none'}
      data-piston-guide-status={guideSession?.status ?? 'idle'}
      data-piston-guide-cue={guideCue ?? 'none'}
    >
      <div className="piston-acquisition-panel-heading">
        <strong className="piston-acquisition-title">{copy.title}</strong>
        <div className="piston-acquisition-run-summary">
          <span>{copy.measurement(measurementNumber, totalMeasurements)}</span>
          <span className={`piston-acquisition-phase is-${effectivePhase}`}>
            {copy.phases[effectivePhase]}
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
        <label>
          <span>{copy.sampleRate}</span>
          <div>
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              value={demoFrame?.sampleRateInput
                ?? (guideSelected ? guideSession.parameterDrafts.sampleRateHz : sampleRateHz)}
              readOnly={demoActive || guideInputsLocked}
              disabled={!demoActive && !guideActive && (phase === 'armed' || phase === 'recording')}
              aria-invalid={guideSession?.parameterStatus.sampleRateHz === 'invalid'}
              onPointerDown={() => {
                if (guideSelected && guideInputsLocked && !guidePaused) {
                  attemptGuideAction('editParameters', 'settings');
                }
              }}
              onChange={(event) => {
                if (guideSelected && !guidePaused) {
                  onGuideParameterEdit?.('sampleRateHz', event.target.value);
                } else if (!demoActive) {
                  setSampleRateHz(Math.max(1, Math.min(1000, Number(event.target.value))));
                }
              }}
              onBlur={() => {
                if (guideSelected && !guidePaused) commitGuideParameter('sampleRateHz');
              }}
              onKeyDown={(event) => {
                if (guideSelected && !guidePaused && event.key === 'Enter') event.currentTarget.blur();
              }}
            />
            <small>Hz</small>
          </div>
        </label>
        <label>
          <span>{copy.triggerThreshold}</span>
          <div>
            <input
              type="number"
              min={96}
              max={108}
              step={0.1}
              value={demoFrame?.triggerInput
                ?? (guideSelected ? guideSession.parameterDrafts.triggerThresholdKpa : triggerKpa)}
              readOnly={demoActive || guideInputsLocked}
              disabled={!demoActive && !guideActive && (phase === 'armed' || phase === 'recording')}
              aria-invalid={guideSession?.parameterStatus.triggerThresholdKpa === 'invalid'}
              onPointerDown={() => {
                if (guideSelected && guideInputsLocked && !guidePaused) {
                  attemptGuideAction('editParameters', 'settings');
                }
              }}
              onChange={(event) => {
                if (guideSelected && !guidePaused) {
                  onGuideParameterEdit?.('triggerThresholdKpa', event.target.value);
                } else if (!demoActive) {
                  setTriggerKpa(Math.max(96, Math.min(108, Number(event.target.value))));
                }
              }}
              onBlur={() => {
                if (guideSelected && !guidePaused) commitGuideParameter('triggerThresholdKpa');
              }}
              onKeyDown={(event) => {
                if (guideSelected && !guidePaused && event.key === 'Enter') event.currentTarget.blur();
              }}
            />
            <small>kPa</small>
          </div>
        </label>
      </div>

      {guideFeedback ? (
        <div
          key={`${guideSession?.feedbackCode}:${guideSession?.updatedAtMs}`}
          className="piston-guide-parameter-feedback"
          data-prompt-feedback-kind="warning"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{guideFeedback}</strong>
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
        <svg viewBox={`0 0 ${graphWidth} ${GRAPH_HEIGHT}`} role="img" aria-label={copy.curveAria}>
          <rect x="0" y="0" width={graphWidth} height={GRAPH_HEIGHT} className="piston-acquisition-chart-bg" />
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
          {pressurePath ? <path d={pressurePath} className="piston-acquisition-pressure-path" /> : null}
          {pressureSampleMarkerPath ? (
            <path
              d={pressureSampleMarkerPath}
              className="piston-acquisition-pressure-sample-markers"
              aria-hidden="true"
            />
          ) : null}
          <line x1={GRAPH_LEFT} x2={graphRight} y1={GRAPH_BOTTOM} y2={GRAPH_BOTTOM} className="piston-acquisition-axis" />
          <line x1={GRAPH_LEFT} x2={GRAPH_LEFT} y1={GRAPH_TOP} y2={GRAPH_BOTTOM} className="piston-acquisition-axis" />
          <text x="18" y="179" transform="rotate(-90 18 179)" textAnchor="middle" className="piston-acquisition-axis-label">
            {copy.pressureAxis}
          </text>
          <text x={graphCenterX} y="372" textAnchor="middle" className="piston-acquisition-axis-label">{copy.timeAxis}</text>
          {!pressurePath ? (
            <text x={graphCenterX} y="179" textAnchor="middle" className="piston-acquisition-empty-label">
              {effectivePhase === 'armed' ? copy.waitingTrigger : copy.emptyCurve}
            </text>
          ) : null}
        </svg>
        <div className="piston-acquisition-actions" role="group" aria-label={copy.actionsAria}>
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
            disabled={demoActive || guidePaused}
            aria-disabled={demoActive || guidePaused || !guidePrimaryAllowed}
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
            aria-label={copy.redo}
            title={copy.redo}
            onClick={() => {
              if (!demoActive) resetRun();
            }}
            disabled={guideSelected || (!demoActive && phase === 'idle')}
            aria-disabled={demoActive || guideSelected}
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
                onRunRetained?.();
              }
            }}
            disabled={demoActive || guidePaused || (!guideSelected && (
              effectivePhase !== 'stopped' || effectiveRetained
            ))}
            aria-disabled={demoActive || guidePaused || (guideSelected && !guideSaveAllowed)}
          >
            <span className="piston-acquisition-action-feedback" aria-hidden="true">
              <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>

      <div className="piston-acquisition-note">
        <span>{copy.preTriggerNote}</span>
        {demoFrame?.retainFeedbackVisible ? (
          <strong>{copy.demoSaved}</strong>
        ) : effectiveRetained ? <strong>{copy.saved}</strong> : null}
      </div>

    </aside>
  );
};

export default PistonOscillationAcquisitionPanel;
