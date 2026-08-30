import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PISTON_ACQUISITION_BASELINE_PRESSURE_KPA,
  PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
  PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS,
  getPistonAcquisitionFormalSampleCount,
} from '../../src/features/pistonOscillation/pistonOscillationAcquisitionConfig.ts';
import {
  getPistonOscillationAdaptivePressureGraphDomain,
  parsePistonOscillationFreeSampleRate,
  parsePistonOscillationFreeTriggerThreshold,
} from '../../src/features/pistonOscillation/pistonOscillationFreeAcquisitionModel.ts';

assert.equal(PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ, 1000);
assert.equal(PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA, 105);
assert.equal(PISTON_ACQUISITION_BASELINE_PRESSURE_KPA, 101.325);
assert.equal(PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS, 6);
assert.equal(getPistonAcquisitionFormalSampleCount(0, 1000), 0);
assert.equal(getPistonAcquisitionFormalSampleCount(0.8, 1000), 801);
assert.equal(getPistonAcquisitionFormalSampleCount(0.5, 1000), 501);
assert.equal(parsePistonOscillationFreeSampleRate('1000'), 1000);
assert.equal(parsePistonOscillationFreeSampleRate('1'), 1);
assert.equal(parsePistonOscillationFreeSampleRate('0'), null);
assert.equal(parsePistonOscillationFreeSampleRate('1001'), null);
assert.equal(parsePistonOscillationFreeSampleRate('10.5'), null);
assert.equal(parsePistonOscillationFreeTriggerThreshold('96'), 96);
assert.equal(parsePistonOscillationFreeTriggerThreshold('120.0'), 120);
assert.equal(parsePistonOscillationFreeTriggerThreshold('130'), 130);
assert.equal(parsePistonOscillationFreeTriggerThreshold('95.9'), null);
assert.equal(parsePistonOscillationFreeTriggerThreshold('130.1'), null);
assert.equal(parsePistonOscillationFreeTriggerThreshold('120.25'), null);

const standardTriggerDomain = getPistonOscillationAdaptivePressureGraphDomain(
  120,
  [101.32],
);
assert.deepEqual(standardTriggerDomain, {
  minimumKpa: 96,
  maximumKpa: 132,
  ticksKpa: [96, 102, 108, 114, 120, 126, 132],
});
for (const triggerThresholdKpa of [96, 100, 120, 130]) {
  const domain = getPistonOscillationAdaptivePressureGraphDomain(
    triggerThresholdKpa,
    [101.32],
  );
  const step = domain.ticksKpa[1]! - domain.ticksKpa[0]!;
  const triggerRatio = (
    triggerThresholdKpa - domain.minimumKpa
  ) / (domain.maximumKpa - domain.minimumKpa);
  assert.ok(triggerRatio >= 0.25 - 1e-9 && triggerRatio <= 0.75 + 1e-9);
  assert.ok(triggerThresholdKpa - domain.minimumKpa >= step - 1e-9);
  assert.ok(domain.maximumKpa - triggerThresholdKpa >= step - 1e-9);
  assert.equal(domain.ticksKpa.every(Number.isInteger), true);
}
const expandedPressureDomain = getPistonOscillationAdaptivePressureGraphDomain(
  120,
  [92, 101.32, 145],
);
assert.ok(expandedPressureDomain.minimumKpa < 92);
assert.ok(expandedPressureDomain.maximumKpa > 145);
assert.throws(
  () => getPistonOscillationAdaptivePressureGraphDomain(130.1, [101.32]),
  /trigger threshold/,
);

const panelSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationAcquisitionPanel.tsx'),
  'utf8',
);
const demoTimelineSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'pistonOscillationDemoTimeline.ts'),
  'utf8',
);
const panelStyles = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationAcquisitionPanel.css'),
  'utf8',
);
const chartControlsStyles = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationChartControls.css'),
  'utf8',
);
assert.match(
  panelSource,
  /const effectivePowerOn = demoFrame\?\.powerOn \?\? powerOn;/,
  'the realtime panel should use the demo power frame when Demo mode is active',
);
assert.match(
  panelSource,
  /freeSession\?\.sampleRateHz == null \? '' : String\(freeSession\.sampleRateHz\)[\s\S]*freeSession\?\.triggerThresholdKpa == null \? '' : String\(freeSession\.triggerThresholdKpa\)/,
  'new and reset Free sessions should show empty acquisition inputs instead of hidden defaults',
);
assert.match(
  panelSource,
  /commitFreeParameter\('sampleRateHz'\)[\s\S]*if \(accepted\) triggerInputRef\.current\?\.focus\(\)[\s\S]*commitFreeParameter\('triggerThresholdKpa'\)/,
  'Enter should move only from a valid sample-rate field to the trigger field while trigger Enter keeps the current blur behavior',
);
assert.match(
  panelSource,
  /const commitGuideParameter = \(field: PistonOscillationGuideParameterField\): boolean => \{[\s\S]*PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ[\s\S]*PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA[\s\S]*Number\(draft\) === expectedValue[\s\S]*commitGuideParameter\('sampleRateHz'\)[\s\S]*if \(accepted\) triggerInputRef\.current\?\.focus\(\)[\s\S]*commitGuideParameter\('triggerThresholdKpa'\)[\s\S]*event\.currentTarget\.blur\(\)/,
  'Guide Enter should mirror Free mode: valid sample rate advances focus and trigger Enter commits before blur',
);
assert.match(
  panelSource,
  /if \(freeCommitRejectedRef\.current\)[\s\S]*return;[\s\S]*if \(!freeAcquisitionParametersValid\)[\s\S]*acquisitionParametersRequired[\s\S]*input\?\.focus\(\)[\s\S]*return;/,
  'Start should remain clickable but block an invalid or missing setup and focus the first required field',
);
assert.match(
  panelSource,
  /freeRunPressureGraphDomain[\s\S]*phaseRef\.current !== 'armed' && phaseRef\.current !== 'recording'[\s\S]*adaptiveFreePressureGraphDomain\.minimumKpa >= current\.minimumKpa[\s\S]*adaptiveFreePressureGraphDomain\.maximumKpa <= current\.maximumKpa[\s\S]*return current/,
  'a live Free run should expand its pressure axis when needed without shrinking it mid-run',
);
assert.match(
  panelSource,
  /const pressureGraphTriggerKpa = parsePistonOscillationFreeTriggerThreshold\([\s\S]*?String\(effectiveTriggerKpa\),[\s\S]*?\) \?\? PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA;[\s\S]*?getPistonOscillationAdaptivePressureGraphDomain\([\s\S]*?pressureGraphTriggerKpa,/,
  'an incomplete demo trigger draft should retain a valid graph domain until the full value is entered',
);
assert.match(
  panelSource,
  /triggerValueVisible[\s\S]*freeSelected && freeAcquisitionParametersValid[\s\S]*pressureIndicatorVisible[\s\S]*!freeSelected \|\| freeAcquisitionParametersValid/,
  'the monitor line and point should remain hidden until both Free acquisition settings are committed',
);
assert.match(
  panelSource,
  /previousPowerOnRef[\s\S]*if \(!wasPowerOn \|\| effectivePowerOn\) return;[\s\S]*resetRun\(\);/,
  'switching the instrument off must clear any armed or recording acquisition state',
);
assert.match(
  panelSource,
  /const freeRecordingActive =[\s\S]*phaseRef\.current === 'recording'[\s\S]*!effectivePowerOn[\s\S]*!releaseEvent[\s\S]*phaseRef\.current !== 'armed' && !freeRecordingActive[\s\S]*!effectivePowerOn[\s\S]*cycleStartMs === null/,
  'neither a piston release nor the sampling clock may record while power is off',
);
assert.match(
  panelSource,
  /if \(!effectivePowerOn\) \{[\s\S]*className="piston-acquisition-panel is-powered-off"[\s\S]*copy\.powerOff[\s\S]*return \([\s\S]*className="piston-acquisition-panel"/,
  'the powered-off branch should replace every inner control and chart with the localized shutdown status',
);
assert.match(
  panelStyles,
  /\.piston-acquisition-panel\.is-powered-off[\s\S]*\.piston-acquisition-power-off-state[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/,
  'the powered-off status should occupy and center itself within the complete realtime content area',
);
assert.match(panelSource, /copy\.preTriggerNote/);
assert.match(
  panelSource,
  /const startsImmediately = freeSelected[\s\S]*currentObservation\.absolutePressureKpa > configuredTriggerKpa[\s\S]*setCycleStartMs\(startsImmediately \? recordingStartedAtMs : null\)[\s\S]*updatePhase\(startsImmediately \? 'recording' : 'armed'\)/,
  'a Free run whose monitor threshold is already met must record from the Start click',
);
assert.match(
  panelSource,
  /createPistonOscillationContinuousRecordingSamples[\s\S]*releaseSegments: freeReleaseSegmentsRef\.current[\s\S]*pressStartedAtMs: freePressStartedAtMsRef\.current[\s\S]*liveObservations: freeLiveObservationsRef\.current[\s\S]*recordingPath: 'immediate'/,
  'Free recording must combine live press intervals with every released oscillation segment',
);
assert.match(
  panelSource,
  /createPistonOscillationContinuousObservationSeries\(\{[\s\S]*samples,[\s\S]*releaseSegments: freeReleaseSegmentsRef\.current,[\s\S]*pressStartedAtMs: freePressStartedAtMsRef\.current,[\s\S]*liveObservations: freeLiveObservationsRef\.current/,
  'an immediate recording stopped before release must still preserve dynamic-sensor provenance',
);
assert.match(
  panelSource,
  /snapshotLockedHeightMm[\s\S]*try \{[\s\S]*createPistonOscillationIncompletePhysicsSnapshot[\s\S]*\} catch \{[\s\S]*return null;/,
  'an acquisition at the rigid lower stop must remain visible but must not become a fabricated savable oscillation record',
);
assert.doesNotMatch(panelSource, />Run 1\/7</);
assert.match(panelSource, /phaseRef\.current === 'armed'[\s\S]*updatePhase\('recording'\)/);
assert.match(
  panelSource,
  /PISTON_OSCILLATION_ACQUISITION_DISPLAY_FRAME_INTERVAL_MS[\s\S]*nowMs - lastDisplayUpdateMs[\s\S]*publishDisplayClock\(nowMs\)[\s\S]*presentedNowMs - cycleStartMs/,
  'the live chart should advance through bounded presentation frames without changing the formal sensor sampling rate',
);
assert.match(
  panelSource,
  /cycleStartMs === null[\s\S]*rebaseDisplayClock\(releaseEvent\.startedAtMs, true\)[\s\S]*createPistonOscillationDynamicSensorObservationSeries[\s\S]*publishDisplayClock\(performance\.now\(\)\)/,
  'release calculation time must become display lag instead of an immediate post-trigger curve jump',
);
assert.match(
  panelSource,
  /displayNowMs[\s\S]*- displayClockLagMs[\s\S]*- PISTON_OSCILLATION_ACQUISITION_PRESENTATION_DELAY_MS[\s\S]*const getCurrentRecordingElapsedSeconds = \(\) => formalElapsedSeconds/,
  'both the visible curve and Pause action must use the same fixed-delay, lag-compensated acquisition time',
);
assert.match(
  panelSource,
  /guideStep === 'waitingTrigger'[\s\S]*phaseRef\.current === 'idle'[\s\S]*handledReleaseEventIdRef\.current = releaseEvent\?\.id \?\? null[\s\S]*updatePhase\('armed'\)/,
  'a remounted waiting-trigger step must automatically restore the armed acquisition state',
);
assert.match(
  panelSource,
  /guideStep === 'recording'[\s\S]*guideSession\.acquisitionCandidate === null[\s\S]*phaseRef\.current === 'idle'[\s\S]*const recoveryAccepted = onGuideAcquisitionEvent\?\.\(\{[\s\S]*type: 'restoreInterruptedAcquisition'[\s\S]*\}\) === true;[\s\S]*if \(!recoveryAccepted\) return;[\s\S]*updatePhase\('armed'\)/,
  'an interrupted partial recording must return to a clean armed attempt instead of deadlocking',
);
assert.match(
  panelSource,
  /restoredGuidePauseCandidate[\s\S]*guideSession\?\.step === 'pauseAvailable'[\s\S]*effectivePhase = demoFrame\?\.acquisitionPhase[\s\S]*restoredGuidePauseCandidate[\s\S]*\? 'recording'[\s\S]*candidate = restoredGuidePauseCandidate[\s\S]*\?\? buildGuideCandidate[\s\S]*guideSession\?\.step === 'pauseAvailable'[\s\S]*guideSession\.acquisitionCandidate/,
  'a complete persisted candidate must restore its curve and remain pausable after remount',
);
assert.match(
  panelSource,
  /handledReleaseEventIdRef = useRef<number \| null>\(releaseEvent\?\.id \?\? null\)[\s\S]*handledReleaseEventIdRef\.current === releaseEvent\.id[\s\S]*handledReleaseEventIdRef\.current = releaseEvent\.id[\s\S]*const handleStart = \(\) => \{[\s\S]*handledReleaseEventIdRef\.current = releaseEvent\?\.id \?\? null/,
  'arming a new run must ignore the retained release event and wait for a later two-hand release',
);
assert.match(
  panelSource,
  /handleStop[\s\S]*getCurrentRecordingElapsedSeconds\(\)[\s\S]*displayedObservationSamples\.at\(-1\)\?\.timeS[\s\S]*setStopElapsedSeconds\(pauseElapsedSeconds\);[\s\S]*updatePhase\('stopped'\);[\s\S]*buildFreeCandidate\(pauseElapsedSeconds\)[\s\S]*if \(!effectiveCandidate\) return;[\s\S]*setStopElapsedSeconds\([\s\S]*effectiveCandidate\.acquisitionSettings\.recordedDurationS/,
  'Free Pause must freeze the exact visible sample frontier even if record packaging is rejected',
);
assert.match(
  panelSource,
  /const singleReleaseRecording = releaseSegments\.length === 1[\s\S]*pressStartedAtMs\.length === 0[\s\S]*liveObservations\.length === 0;[\s\S]*createPistonOscillationRecordedObservationSamples\([\s\S]*activeObservationSeries,[\s\S]*triggerSourceSampleIndex,[\s\S]*const snapshotObservationSeries = singleReleaseRecording[\s\S]*\? activeObservationSeries/,
  'a normal one-release Free run must package the same observed source and frontier shown by the live chart',
);
assert.match(
  panelSource,
  /const nextTrajectory = releaseEvent\.trajectory;[\s\S]*createPistonOscillationDynamicSensorObservationSeries\([\s\S]*nextTrajectory\.samples,[\s\S]*nextTrajectory\.sampleRateHz,[\s\S]*initialState: livePressureObservation\?\.sensorState \?\? null,[\s\S]*config: livePressureObservation\?\.sensorConfig[\s\S]*findPistonOscillationObservedFallingTriggerSample\([\s\S]*nextObservationSeries,[\s\S]*configuredTriggerKpa[\s\S]*setTriggerSeconds\(nextTriggerSeconds\);[\s\S]*setTriggerSourceSampleIndex\(nextTriggerSample\?\.sampleIndex \?\? null\);/,
  'formal acquisition must quantize the released trajectory before choosing its discrete falling-trigger sample',
);
assert.match(
  panelSource,
  /const nextTriggerSeconds = nextTriggerSample\?\.timeS \?\? null;[\s\S]*if \(freeSelected && nextTriggerSeconds === null\) \{[\s\S]*freeReleaseSegmentsRef\.current = \[\];[\s\S]*setCycleStartMs\(null\);[\s\S]*setActiveTrajectory\(null\);[\s\S]*setActiveObservationSeries\(null\);[\s\S]*setFreeRunPressureGraphDomain\(null\);[\s\S]*resetDisplayClock\(performance\.now\(\)\);[\s\S]*return;/,
  'a Free release that never crosses the trigger must discard its projection and restore the live monitor for the next press',
);
assert.match(
  panelSource,
  /const baseObservationSeries = createPistonOscillationDynamicSensorObservationSeries\([\s\S]*const expectedPeriodS = 1[\s\S]*getPistonOscillationSmallSignalFrequencyFromLockedHeightHz\([\s\S]*const nextObservationSeries = applyPistonOscillationTailIrregularityObservation\(\{[\s\S]*observationSeries: baseObservationSeries,[\s\S]*expectedPeriodS,[\s\S]*findPistonOscillationObservedFallingTriggerSample\([\s\S]*nextObservationSeries/,
  'formal acquisition must apply the seeded tail irregularity observation before display, trigger slicing, and persistence',
);
assert.match(
  panelSource,
  /const localPresentationElapsedSinceReleaseSeconds[\s\S]*const localElapsedSinceReleaseSeconds[\s\S]*triggerSeconds \+ getPistonOscillationAcquisitionDisplayedFormalElapsedSeconds\([\s\S]*localPresentationElapsedSinceReleaseSeconds - triggerSeconds[\s\S]*const localFormalElapsedSeconds/,
  'manual acquisition must slow the initial visible post-trigger window without rescaling stored sample time',
);
assert.match(
  panelSource,
  /createPistonOscillationIncompletePhysicsSnapshot\(\{[\s\S]*thermodynamicState: freeSession\.instrumentState\.thermodynamicState,[\s\S]*linearDampingNsPerM:[\s\S]*PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M/,
  'new immediate-path press captures must explicitly record the formal 1.1 loss',
);
assert.doesNotMatch(
  panelSource,
  /getPistonAcquisitionPresetPressureKpa|findPistonAcquisitionFallingTriggerSeconds/,
  'formal acquisition must not retain a synthetic preset trajectory fallback',
);
assert.match(
  panelSource,
  /interface PistonOscillationReleaseEvent[\s\S]*trajectory: PistonOscillationTrajectory;/,
  'every formal release event must carry its physical trajectory',
);
assert.match(
  panelSource,
  /const configuredTriggerKpa = guideSelected[\s\S]*PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA[\s\S]*findPistonOscillationObservedFallingTriggerSample\([\s\S]*configuredTriggerKpa/,
  'Guide acquisition must use the validated 120 kPa protocol value rather than the Free-mode default',
);
assert.match(
  panelSource,
  /preTriggerPeakPressureKpaRef\.current[\s\S]*nextObservationSeries\.samples\[0\]\?\.absolutePressureKpa[\s\S]*peakPressureKpa < PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA[\s\S]*reason: 'underpressure'[\s\S]*peakPressureKpa > PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA[\s\S]*guidePendingOverpressurePeakKpaRef\.current = peakPressureKpa[\s\S]*type: 'pressureAttemptAccepted'/,
  'Guide pressure quality must use the temporary quantized monitor peak and the release sample before formal triggering',
);
assert.match(
  panelSource,
  /setStopElapsedSeconds\(PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S\)[\s\S]*const overpressurePeakKpa = guidePendingOverpressurePeakKpaRef\.current;[\s\S]*reason: 'overpressure'[\s\S]*\}\) === true;[\s\S]*if \(!rejectionAccepted\) return;[\s\S]*setGuidePressureIssue\('overpressure'\)[\s\S]*updatePhase\('stopped'\)/,
  'an overpressure attempt must freeze at the fixed frontier and receive parent acceptance before it unlocks Redo',
);
assert.match(
  panelSource,
  /useSyncExternalStore\([\s\S]*livePressureChannel\?\.subscribe[\s\S]*livePressureObservation\.absolutePressureKpa[\s\S]*data-piston-pressure-indicator/,
  'the waiting-trigger chart must subscribe to the independent live pressure channel and expose its indicator state',
);
assert.match(
  panelSource,
  /handledPressStartEventIdRef[\s\S]*phaseRef\.current !== 'recording'[\s\S]*freePressStartedAtMsRef\.current[\s\S]*setFreeRecordingTimelineRevision/,
  'a later two-hand press must interrupt the active release segment without restarting the Free recording',
);
assert.doesNotMatch(
  panelSource,
  /onReleaseControlHoldChange|releaseControlExternallyHeld/,
  'acquisition duration must not keep the physical platform control locked',
);
assert.match(panelSource, /piston-acquisition-quality-upper-line/);
assert.match(panelStyles, /piston-acquisition-pressure-indicator\.is-valid/);
assert.match(panelStyles, /piston-acquisition-pressure-indicator\.is-over/);
assert.match(
  panelSource,
  /const handleGuideOverpressureRedo = \(\) => \{[\s\S]*type: 'redoOverpressureAttempt'[\s\S]*\) !== true[\s\S]*updatePhase\('armed'\)[\s\S]*data-piston-guide-target="redo"[\s\S]*guideCue === 'redo'[\s\S]*guidePressureIssue === 'overpressure'[\s\S]*handleGuideOverpressureRedo\(\)/,
  'an overpressure attempt must unlock and pulse the dedicated Redo control before re-arming acquisition',
);
assert.match(
  panelSource,
  /const getObservedPressureKpa = \([\s\S]*Math\.floor\(timeS \* sampleRateHz \+ 1e-9\)[\s\S]*samples\[sampleIndex\]\?\.absolutePressureKpa/,
  'live pressure must read a discrete observed sample without interpolating between sensor times',
);
assert.doesNotMatch(
  panelSource,
  /getPistonOscillationTrajectorySampleAt|findPistonOscillationFallingTriggerTimeS|simulatePistonOscillationIdealAdiabaticRelease|createPistonOscillationIdealSensorReferenceSeries|pistonOscillationLegacyCompatibility/,
  'the acquisition panel must not recover interpolated physical pressure or a continuous threshold crossing',
);
assert.doesNotMatch(
  demoTimelineSource,
  /simulatePistonOscillationIdealAdiabaticRelease|createPistonOscillationIdealAdiabaticLoadedGasState|createPistonOscillationIdealSensorReferenceSeries|pistonOscillationLegacyCompatibility/,
  'Demo generation must stay on the same current thermal and sensor chain as live acquisition',
);
assert.match(
  panelSource,
  /const buildGuideCandidate = useCallback\(\(durationS: number\) => \{[\s\S]*!activeObservationSeries[\s\S]*triggerSourceSampleIndex === null[\s\S]*const samples = createPistonOscillationRecordedObservationSamples\([\s\S]*activeObservationSeries,[\s\S]*triggerSourceSampleIndex,[\s\S]*boundedDurationS[\s\S]*sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot\(\{[\s\S]*sampleRateHz: activeObservationSeries\.sampleRateHz,[\s\S]*triggerSourceSampleIndex,[\s\S]*observationSeries: activeObservationSeries/,
  'Guide candidates must contain the trigger-relative observed samples and their versioned sensor snapshot',
);
assert.match(
  panelSource,
  /targetHeightMm,[\s\S]*confirmedHeightMm: activeTrajectory\.equilibrium\.equilibriumHeightM \* 1_000/,
  'the nominal calculation height and captured physical height must remain separate',
);
assert.match(
  panelSource,
  /phase !== 'recording'[\s\S]*formalElapsedSeconds < PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S[\s\S]*setStopElapsedSeconds\(PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S\)[\s\S]*guideSession\?\.step !== 'recording'[\s\S]*guidePendingRecordingCandidateRef\.current[\s\S]*buildGuideCandidate\(PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S\)[\s\S]*type: 'recordingReady'[\s\S]*candidate/,
  'Guide recording must freeze at the fixed sample frontier before the canonical commit can be accepted',
);
const recordingReadyEffectStart = panelSource.indexOf(
  "  useEffect(() => {\n    if (\n      !guideActive",
  panelSource.indexOf('const buildGuideCandidate'),
);
const handleStartIndex = panelSource.indexOf('  const handleStart = () => {', recordingReadyEffectStart);
assert.ok(recordingReadyEffectStart >= 0 && handleStartIndex > recordingReadyEffectStart);
const recordingReadyEffectSource = panelSource.slice(recordingReadyEffectStart, handleStartIndex);
assert.match(
  recordingReadyEffectSource,
  /setStopElapsedSeconds\(PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S\)[\s\S]*guidePendingRecordingCandidateRef\.current = candidate[\s\S]*displayNowMs - lastAttemptedAtMs < 120[\s\S]*if \(overpressurePeakKpa !== null\)[\s\S]*updatePhase\('stopped'\)[\s\S]*return;[\s\S]*type: 'recordingReady'[\s\S]*if \(!recordingAccepted\) return/,
  'a valid recording must freeze on time and retry the same pending candidate after a transient parent rejection',
);
assert.doesNotMatch(
  recordingReadyEffectSource,
  /guideRecordingReadyNotifiedRef/,
  'recording completion must not depend on a stale one-shot notification latch',
);
assert.doesNotMatch(
  recordingReadyEffectSource,
  /if \(!guidePauseReady\) return/,
  'physical settling must not block recording-ready or leave the Guide controls grey forever',
);
assert.match(
  panelSource,
  /const handleStart = \(\) => \{[\s\S]*guideActive[\s\S]*type: 'startAcquisition'[\s\S]*\) !== true[\s\S]*const recordingStartedAtMs = performance\.now\(\)[\s\S]*updatePhase\(startsImmediately \? 'recording' : 'armed'\)/,
  'Guide Start must receive parent acceptance before the panel arms locally',
);
assert.match(
  panelSource,
  /phaseRef\.current === 'armed'[\s\S]*if \(guideActive\) \{[\s\S]*type: 'triggered'[\s\S]*\) === true[\s\S]*guideTriggeredNotifiedRef\.current = true;[\s\S]*updatePhase\('recording'\)/,
  'the trigger must receive parent acceptance before the panel records or latches its notification',
);
assert.match(
  panelSource,
  /const handleStop = \(\) => \{[\s\S]*const requestedPauseElapsedSeconds = getCurrentRecordingElapsedSeconds\(\)[\s\S]*buildGuideCandidate\(pauseElapsedSeconds\)[\s\S]*if \(!effectiveCandidate\) return;[\s\S]*const pauseAccepted = onGuideAcquisitionEvent\?\.\(\{[\s\S]*type: 'curvePaused',[\s\S]*candidate,[\s\S]*\}\) === true;[\s\S]*if \(!pauseAccepted\) return;[\s\S]*updatePhase\('stopped'\)/,
  'Guide Pause should freeze locally only after publishing a valid candidate and receiving parent acceptance',
);
assert.match(
  panelSource,
  /onGuideAcquisitionEvent\?: \(event: PistonOscillationGuideAcquisitionEvent\) => boolean;/,
  'the Guide acquisition adapter must synchronously confirm whether it accepted an event',
);
assert.match(
  panelSource,
  /guideSession\.step === 'awaitingSaveOrRedo'[\s\S]*const saveDisabled = Boolean\([\s\S]*\? !guideSaveAllowed[\s\S]*onGuideAcquisitionEvent\?\.\(\{ type: 'saveMeasurement' \}\) !== true[\s\S]*setRetained\(true\)[\s\S]*onRunRetained\?\.\(\)[\s\S]*disabled=\{saveDisabled\}[\s\S]*aria-disabled=\{saveDisabled\}/,
  'Save must use one native/accessibility gate and persist the Guide measurement before advancing locally',
);
assert.match(
  panelSource,
  /if \(guidePaused\) \{[\s\S]*guidePauseStartedAtMsRef\.current \?\?= nowMs[\s\S]*guideAccumulatedPauseMsRef\.current \+= nowMs - guidePauseStartedAtMsRef\.current/,
  'Guide Pause and Resume should remove paused wall-clock time from acquisition timing',
);
assert.match(
  panelSource,
  /const guideSessionStartedAtMs = guideSession === undefined[\s\S]*: guideSession\.startedAtMs;[\s\S]*if \(guideSessionStartedAtMs === undefined\) return;[\s\S]*resetRun\(\);[\s\S]*\[guideSessionStartedAtMs, resetRun\]/,
  'an explicit exited Guide session with startedAtMs null should reset acquisition while an absent Demo session should not',
);
const settingsMarkupStart = panelSource.indexOf('<div\n        className={`piston-acquisition-settings');
const liveReadoutStart = panelSource.indexOf('<div className="piston-acquisition-live-readout">');
assert.ok(settingsMarkupStart >= 0 && liveReadoutStart > settingsMarkupStart);
const settingsMarkup = panelSource.slice(settingsMarkupStart, liveReadoutStart);
assert.equal(
  (settingsMarkup.match(/is-guide-highlighted/g) ?? []).length,
  1,
  'the two parameter inputs should breathe as one settings group rather than as separate controls',
);
assert.doesNotMatch(
  panelSource,
  /guideStrongReminder|is-guide-strong-highlighted/,
  'strong-reminder behavior should remain outside this Run1 Guide checkpoint',
);
assert.match(
  panelSource,
  /getObservedPressureGraphDomain\s*=\s*\([\s\S]*sample\.absolutePressureKpa[\s\S]*minimumKpa[\s\S]*maximumKpa/,
  'formal graph bounds must be derived from quantized observation pressures',
);
assert.match(
  panelSource,
  /activeObservationSeries && triggerSourceSampleIndex !== null[\s\S]*getObservedPressureGraphDomain\(activeObservationSeries\.samples\.slice\([\s\S]*DEFAULT_PRESSURE_GRAPH_DOMAIN/,
  'formal graph bounds must use the observed post-trigger window while the empty-state bounds remain a fallback',
);
assert.match(
  panelSource,
  /getPistonOscillationDemoObservationSeries\(demoFrame\.measurementIndex\)[\s\S]*findPistonOscillationObservedFallingTriggerSample[\s\S]*createPistonOscillationRecordedObservationSamples/,
  'each demo run must use the shared current dynamic-sensor and falling-trigger chain',
);
assert.match(
  panelSource,
  /demoObservationSeries && demoTriggerSample[\s\S]*Math\.floor\([\s\S]*formalElapsedSeconds \* demoObservationSeries\.sampleRateHz[\s\S]*intervalCount \/ demoObservationSeries\.sampleRateHz/,
  'an animated Demo duration must be snapped to the 1000 Hz sample-time grid before observation samples are sliced',
);
assert.match(
  panelSource,
  /data-piston-demo-virtual-keyboard="true"[\s\S]*copy\.virtualKeyboard[\s\S]*data-piston-demo-key="action"/,
  'the demo parameter step must visibly operate an on-screen numeric keypad rather than only revealing field text',
);
assert.match(
  panelStyles,
  /\.piston-demo-virtual-keyboard \{[\s\S]*var\(--piston-acquisition-panel-bg\)[\s\S]*\.studio-theme-light \.piston-demo-virtual-keyboard[\s\S]*@media \(prefers-reduced-motion: reduce\)[\s\S]*\.piston-demo-virtual-keyboard/,
  'the demo keypad must reuse acquisition theme tokens and provide a reduced-motion path',
);
assert.match(panelSource, /piston-acquisition-title[\s\S]*copy\.title/);
assert.match(
  panelSource,
  /const totalMeasurements = demoFrame[\s\S]*demoFrame\.measurementCount[\s\S]*guideSelected[\s\S]*PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS[\s\S]*PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS[\s\S]*piston-acquisition-run-summary[\s\S]*copy\.measurement\(measurementNumber, totalMeasurements\)[\s\S]*piston-acquisition-phase/,
  'localized measurement progress should show three demo or guide runs and no more than six free-mode runs in the compact summary',
);
assert.doesNotMatch(panelSource, /电脑采集软件|绝对压力采集|演示审查值，可调整/);
assert.match(panelSource, /const GRAPH_DEFAULT_WIDTH = 860;/);
assert.match(
  panelSource,
  /const FREE_GRAPH_MINIMUM_DOMAIN_SECONDS = 0\.4;[\s\S]*const graphMinimumDomainSeconds = guideSelected \|\| demoFrame[\s\S]*: FREE_GRAPH_MINIMUM_DOMAIN_SECONDS;/,
  'free acquisition should reserve the chart width for the informative first 0.4 seconds',
);
assert.match(panelSource, /new ResizeObserver\(updateGraphWidth\)/);
assert.match(
  panelSource,
  /<strong>\{formatPistonOscillationObservedPressureKpa\(currentPressureKpa\)\} <small>kPa<\/small><\/strong>/,
  'the formal pressure readout must always use the two-decimal sensor formatter',
);
const pressurePathStart = panelSource.indexOf('const buildPressurePath = (');
const pressureMarkerPathStart = panelSource.indexOf(
  'const buildPressureSampleMarkerPath = (',
  pressurePathStart,
);
const acquisitionComponentStart = panelSource.indexOf(
  'export const PistonOscillationAcquisitionPanel',
  pressureMarkerPathStart,
);
assert.ok(
  pressurePathStart >= 0
    && pressureMarkerPathStart > pressurePathStart
    && acquisitionComponentStart > pressureMarkerPathStart,
  'the observed path and marker builders must remain independently inspectable',
);
const pressurePathSource = panelSource.slice(pressurePathStart, pressureMarkerPathStart);
const pressureMarkerPathSource = panelSource.slice(
  pressureMarkerPathStart,
  acquisitionComponentStart,
);
assert.match(
  pressurePathSource,
  /for \(const sample of samples\)[\s\S]*sample\.timeS[\s\S]*sample\.absolutePressureKpa[\s\S]*points\.push\(`\$\{points\.length === 0 \? 'M' : 'L'\}/,
  'the pressure polyline must include every visible formal observation in order',
);
assert.doesNotMatch(
  pressurePathSource,
  /stride|Math\.ceil|filter\(|getPistonOscillationTrajectorySampleAt/,
  'the scientific polyline must not decimate, smooth, or interpolate its observation vertices',
);
assert.match(
  pressureMarkerPathSource,
  /const markerStride = getPressureSampleMarkerStride\(visibleSampleCount, plotWidth\);[\s\S]*const markerRadius = GRAPH_SAMPLE_MARKER_RADIUS_PX;[\s\S]*index \+= markerStride/,
  'ordinary sample markers should use the shared denser pixel-aware stride without altering the full polyline',
);
assert.match(
  panelSource,
  /const GRAPH_SAMPLE_MARKER_TARGET_SPACING_PX = 1\.5;[\s\S]*const GRAPH_SAMPLE_MARKER_RADIUS_PX = 1\.6;[\s\S]*getPressureSampleMarkerStride/,
  'the acquisition graph should expose formal 1000 Hz samples at a denser visual cadence',
);
assert.match(
  panelSource,
  /const visibleSampleCount = getVisiblePressureSampleCount\([\s\S]*const markerStride = getPressureSampleMarkerStride\([\s\S]*context\.beginPath\(\);[\s\S]*sampleIndex < visibleSampleCount;[\s\S]*context\.moveTo\(x \+ GRAPH_SAMPLE_MARKER_RADIUS_PX, y\);[\s\S]*context\.arc\(x, y, GRAPH_SAMPLE_MARKER_RADIUS_PX[\s\S]*context\.fill\(\);/,
  'live sample markers should be filled as one canvas path to preserve recording responsiveness',
);
assert.match(
  panelSource,
  /className="piston-acquisition-pressure-sample-markers"[\s\S]*aria-hidden="true"/,
  'adaptive observation markers must render as a visual layer without flooding the accessibility tree',
);
assert.match(
  panelSource,
  /liveCanvasPressurePresentation[\s\S]*for \(const sample of displayedObservationSamples\)[\s\S]*context\.lineTo\(x, y\)[\s\S]*data-piston-acquisition-live-curve="true"/,
  'active recording should draw every visible formal sample on a lightweight canvas without changing the saved series',
);
assert.match(
  panelStyles,
  /\.piston-acquisition-live-curve-canvas\s*\{[\s\S]*position:\s*absolute;[\s\S]*pointer-events:\s*none;/,
  'the live canvas should overlay the scientific axes without intercepting acquisition controls',
);
assert.match(
  panelSource,
  /aria-label=\{primaryLabel\}[\s\S]*aria-label=\{copy\.redo\}[\s\S]*aria-label=\{copy\.save\}/,
  'start and pause should share the first slot before redo and save',
);
assert.match(panelStyles, /\.piston-acquisition-settings label\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;/);
assert.match(
  panelStyles,
  /\.piston-acquisition-panel\s*\{[\s\S]*--piston-acquisition-panel-bg:\s*var\(--studio-surface-2,[\s\S]*--piston-acquisition-surface:\s*var\(--studio-surface,/,
  'the acquisition workspace should inherit dark workbench surfaces by default',
);
assert.match(
  panelStyles,
  /\.studio-theme-light \.piston-acquisition-panel\s*\{[\s\S]*--piston-acquisition-panel-bg:\s*#f4f7f9;[\s\S]*--piston-acquisition-surface:\s*#ffffff;/,
  'the reviewed light acquisition palette should remain available through a scoped theme override',
);
assert.match(panelStyles, /\.piston-acquisition-run-summary > span:first-child\s*\{[\s\S]*font-size:\s*11px;[\s\S]*font-weight:\s*700;/);
assert.match(
  panelStyles,
  /\.piston-acquisition-chart-wrap\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) 32px;[\s\S]*background:\s*var\(--piston-acquisition-surface-soft\);[\s\S]*\.piston-acquisition-chart-viewport\s*\{[\s\S]*background:\s*var\(--piston-acquisition-surface\);[\s\S]*\.piston-acquisition-chart-footer\s*\{[\s\S]*grid-template-columns:\s*84px minmax\(0, 1fr\) 84px;/,
  'the acquisition chart must mirror processing with a tinted shell, white plot viewport, and compact shared footer',
);
assert.match(
  panelStyles,
  /\.piston-acquisition-pressure-path\s*\{[\s\S]*stroke-linecap:\s*butt;[\s\S]*stroke-linejoin:\s*miter;/,
  'the observation polyline must preserve angular sample-to-sample joins instead of rounded smoothing',
);
assert.match(
  panelStyles,
  /\.piston-acquisition-pressure-sample-markers\s*\{[\s\S]*fill:\s*var\(--piston-acquisition-curve\);[\s\S]*stroke-width:\s*0\.75;[\s\S]*opacity:\s*0\.9;[\s\S]*pointer-events:\s*none;/,
  'adaptive observation markers must remain visible but subordinate to the measured polyline',
);
assert.match(
  chartControlsStyles,
  /\.piston-chart-action-strip\s*\{[\s\S]*width:\s*84px;[\s\S]*height:\s*28px;[\s\S]*grid-template-columns:\s*repeat\(3, 1fr\);[\s\S]*border-radius:\s*0;/,
  'acquisition and processing must share one exact three-button strip geometry',
);
assert.match(panelStyles, /grid-template-rows:\s*auto auto auto minmax\(150px,\s*1fr\) auto;/);
assert.match(
  panelSource,
  /const guideSelected = guideSession\?\.status === 'active'[\s\S]*guideSession\?\.status === 'completed'[\s\S]*const guideActive = guideSession\?\.status === 'active'/,
  'completed Guide sessions must remain selected while no longer being active',
);
assert.doesNotMatch(panelSource, /guideSession\?\.status === 'paused'/);
assert.match(
  panelSource,
  /data-piston-acquisition-action="primary"[\s\S]*data-piston-acquisition-action="redo"[\s\S]*data-piston-acquisition-action="save"/,
  'all three acquisition controls should expose the shared press-feedback contract',
);
assert.match(
  `${panelStyles}\n${chartControlsStyles}`,
  /\.piston-acquisition-action-feedback\s*\{[\s\S]*transform:\s*scale\(1\);[\s\S]*transform 240ms cubic-bezier\(0\.18, 1\.65, 0\.35, 1\);[\s\S]*button:not\(:disabled\):active \.piston-acquisition-action-feedback\s*\{[\s\S]*transform:\s*scale\(0\.72\);/,
  'enabled acquisition controls should compress on hit and spring back after release in Guide and Free modes',
);
assert.equal(
  (panelSource.match(/className="piston-acquisition-action-feedback"/g) ?? []).length,
  3,
  'all three acquisition controls should render an independent press-feedback layer',
);
assert.match(
  panelSource,
  /const guidePrimaryControl = guideSelected[\s\S]*getPistonOscillationGuidePrimaryControlState\(\{[\s\S]*status: guideSession\.status,[\s\S]*step: guideSession\.step,[\s\S]*pauseReady: guidePauseReady,[\s\S]*candidateAvailable: guideSession\.acquisitionCandidate !== null,[\s\S]*const guidePrimaryAction = guidePrimaryControl\?\.action \?\? null;[\s\S]*const primaryShowsPause = guideSelected[\s\S]*guidePrimaryControl\?\.showsPause === true[\s\S]*const primaryLabel = primaryShowsPause \? copy\.pause : copy\.start/,
  'Guide primary presentation and action must derive from the canonical Guide step',
);
assert.match(
  panelSource,
  /const guidePrimaryAllowed = !guideSelected \|\| guidePrimaryControl\?\.allowed === true;[\s\S]*const primaryDisabled = Boolean\([\s\S]*!guidePrimaryAllowed[\s\S]*const guideSaveAllowed = Boolean\([\s\S]*guideSession\.step === 'awaitingSaveOrRedo'/,
  'completion must lock both the primary acquisition action and Save',
);
assert.match(
  panelSource,
  /aria-label=\{primaryLabel\}[\s\S]*title=\{primaryLabel\}[\s\S]*if \(primaryDisabled\) return;[\s\S]*attemptGuideAction\(guidePrimaryAction, 'primary'\)[\s\S]*guidePrimaryAction === 'pauseAcquisition' \? handleStop : handleStart[\s\S]*disabled=\{primaryDisabled\}[\s\S]*aria-disabled=\{primaryDisabled\}[\s\S]*primaryShowsPause \? \(/,
  'the Guide primary label, action, native disabled state, accessibility state, and icon must stay aligned',
);
assert.match(
  panelSource,
  /guideCue === 'start' \|\| guideCue === 'pause'[\s\S]*\? 'is-guide-highlighted'[\s\S]*data-piston-guide-target="primary"[\s\S]*guideCue === 'save' \? 'is-guide-highlighted'[\s\S]*data-piston-guide-target="save"/,
  'Guide cues must highlight the exact primary or Save button rather than the entire action strip',
);
assert.match(
  chartControlsStyles,
  /\.piston-chart-action-strip button\.is-guide-highlighted\s*\{[\s\S]*isolation:\s*isolate;[\s\S]*overflow:\s*hidden;[\s\S]*background:\s*#117db8;[\s\S]*color:\s*#fff;[\s\S]*opacity:\s*1;[\s\S]*piston-chart-action-guide-fill-pulse/,
  'the exact Guide target should use the reviewed strong blue fill',
);
assert.match(
  chartControlsStyles,
  /\.piston-chart-action-strip button\.is-guide-highlighted::after\s*\{[\s\S]*inset:\s*2px;[\s\S]*border:\s*2px solid rgba\(255, 255, 255, 0\.78\);[\s\S]*piston-chart-action-guide-outline-pulse/,
  'the exact Guide target should carry a closed two-pixel inner outline',
);
assert.match(
  chartControlsStyles,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*button\.is-guide-highlighted\s*\{[\s\S]*background:\s*#117db8;[\s\S]*animation:\s*none;[\s\S]*button\.is-guide-highlighted::after\s*\{[\s\S]*border-color:\s*#fff;[\s\S]*animation:\s*none;/,
  'the strong fill and closed outline must remain visible without animation in reduced-motion mode',
);

console.log('pistonOscillationAcquisitionConfig tests passed');
