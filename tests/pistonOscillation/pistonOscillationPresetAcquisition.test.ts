import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PISTON_ACQUISITION_BASELINE_PRESSURE_KPA,
  PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
  PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS,
  findPistonAcquisitionFallingTriggerSeconds,
  getPistonAcquisitionFormalSampleCount,
  getPistonAcquisitionPresetPressureKpa,
} from '../../src/features/pistonOscillation/pistonOscillationPresetAcquisition.ts';

assert.equal(PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ, 1000);
assert.equal(PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA, 105);
assert.equal(PISTON_ACQUISITION_BASELINE_PRESSURE_KPA, 101.325);
assert.equal(PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS, 6);
assert.ok(
  getPistonAcquisitionPresetPressureKpa(0) > PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  'the preset release should begin above the falling trigger threshold',
);

const triggerSeconds = findPistonAcquisitionFallingTriggerSeconds(
  PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ,
);
assert.notEqual(triggerSeconds, null);
assert.ok((triggerSeconds ?? 1) > 0 && (triggerSeconds ?? 1) < 0.1);
assert.ok(
  getPistonAcquisitionPresetPressureKpa(triggerSeconds ?? 0)
    < PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA,
  'formal recording should begin at the first below-threshold sample',
);
assert.equal(getPistonAcquisitionFormalSampleCount(0, 1000), 0);
assert.equal(getPistonAcquisitionFormalSampleCount(0.8, 1000), 801);
assert.equal(getPistonAcquisitionFormalSampleCount(0.5, 1000), 501);

const appEntrySource = readFileSync(join(process.cwd(), 'src', 'app', 'index.tsx'), 'utf8');
const panelSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationAcquisitionPanel.tsx'),
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
  /previousPowerOnRef[\s\S]*if \(!wasPowerOn \|\| effectivePowerOn\) return;[\s\S]*resetRun\(\);/,
  'switching the instrument off must clear any armed or recording acquisition state',
);
assert.match(
  panelSource,
  /if \(!effectivePowerOn \|\| !releaseEvent \|\| phaseRef\.current !== 'armed'\) return;[\s\S]*!effectivePowerOn[\s\S]*cycleStartMs === null/,
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
assert.match(
  appEntrySource,
  /pistonAcquisitionPreviewEnabled\s*=\s*import\.meta\.env\.DEV[\s\S]*pistonAcquisitionPreview['"]\) === ['"]1['"]/,
  'the acquisition review page must stay behind its development-only query switch',
);
assert.match(panelSource, /copy\.preTriggerNote/);
assert.doesNotMatch(panelSource, />Run 1\/7</);
assert.match(panelSource, /phaseRef\.current === 'armed'[\s\S]*updatePhase\('recording'\)/);
assert.match(
  panelSource,
  /ACQUISITION_DISPLAY_FRAME_INTERVAL_MS = 1000 \/ 30[\s\S]*nowMs - lastDisplayUpdateMs >= ACQUISITION_DISPLAY_FRAME_INTERVAL_MS[\s\S]*setDisplayNowMs\(nowMs\)/,
  'the live chart should render at a bounded display cadence without changing the formal sensor sampling rate',
);
assert.match(
  panelSource,
  /guideStep === 'waitingTrigger'[\s\S]*phaseRef\.current === 'idle'[\s\S]*handledReleaseEventIdRef\.current = releaseEvent\?\.id \?\? null[\s\S]*updatePhase\('armed'\)/,
  'a remounted waiting-trigger step must automatically restore the armed acquisition state',
);
assert.match(
  panelSource,
  /guideStep === 'recording'[\s\S]*guideSession\.acquisitionCandidate === null[\s\S]*phaseRef\.current === 'idle'[\s\S]*updatePhase\('armed'\)[\s\S]*restoreInterruptedAcquisition/,
  'an interrupted partial recording must return to a clean armed attempt instead of deadlocking',
);
assert.match(
  panelSource,
  /restoredGuidePauseCandidate[\s\S]*guideSession\?\.step === 'pauseAvailable'[\s\S]*effectivePhase = demoFrame\?\.acquisitionPhase[\s\S]*restoredGuidePauseCandidate[\s\S]*\? 'recording'[\s\S]*const candidate = restoredGuidePauseCandidate \?\? buildGuideCandidate/,
  'a complete persisted candidate must restore its curve and remain pausable after remount',
);
assert.match(
  panelSource,
  /handledReleaseEventIdRef = useRef<number \| null>\(releaseEvent\?\.id \?\? null\)[\s\S]*handledReleaseEventIdRef\.current === releaseEvent\.id[\s\S]*handledReleaseEventIdRef\.current = releaseEvent\.id[\s\S]*const handleStart = \(\) => \{[\s\S]*handledReleaseEventIdRef\.current = releaseEvent\?\.id \?\? null/,
  'arming a new run must ignore the retained release event and wait for a later two-hand release',
);
assert.match(panelSource, /handleStop[\s\S]*setStopElapsedSeconds\(formalElapsedSeconds\)/);
assert.match(
  panelSource,
  /const nextTrajectory = releaseEvent\.trajectory \?\? null;[\s\S]*createPistonOscillationSensorObservationSeries\([\s\S]*nextTrajectory\.samples,[\s\S]*nextTrajectory\.sampleRateHz[\s\S]*findPistonOscillationObservedFallingTriggerSample\([\s\S]*nextObservationSeries,[\s\S]*configuredTriggerKpa[\s\S]*setTriggerSeconds\(nextTriggerSeconds\);[\s\S]*setTriggerSourceSampleIndex\(nextTriggerSample\?\.sampleIndex \?\? null\);/,
  'formal acquisition must quantize the released trajectory before choosing its discrete falling-trigger sample',
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
  /setStopElapsedSeconds\(candidate\.acquisitionSettings\.recordedDurationS\)[\s\S]*const overpressurePeakKpa = guidePendingOverpressurePeakKpaRef\.current;[\s\S]*setGuidePressureIssue\('overpressure'\)[\s\S]*updatePhase\('stopped'\)[\s\S]*reason: 'overpressure'[\s\S]*return;[\s\S]*type: 'recordingReady', candidate/,
  'an overpressure attempt must finish and freeze its observed curve before it is rejected rather than discarding the trace at release',
);
assert.match(
  panelSource,
  /useSyncExternalStore\([\s\S]*livePressureChannel\?\.subscribe[\s\S]*livePressureObservation\.absolutePressureKpa[\s\S]*data-piston-pressure-indicator/,
  'the waiting-trigger chart must subscribe to the independent live pressure channel and expose its indicator state',
);
assert.match(panelSource, /piston-acquisition-quality-upper-line/);
assert.match(panelStyles, /piston-acquisition-pressure-indicator\.is-valid/);
assert.match(panelStyles, /piston-acquisition-pressure-indicator\.is-over/);
assert.match(
  panelSource,
  /const handleGuideOverpressureRedo = \(\) => \{[\s\S]*updatePhase\('armed'\)[\s\S]*type: 'redoOverpressureAttempt'[\s\S]*data-piston-guide-target="redo"[\s\S]*guideCue === 'redo'[\s\S]*guidePressureIssue === 'overpressure'[\s\S]*handleGuideOverpressureRedo\(\)/,
  'an overpressure attempt must unlock and pulse the dedicated Redo control before re-arming acquisition',
);
assert.match(
  panelSource,
  /const getObservedPressureKpa = \([\s\S]*Math\.floor\(timeS \* sampleRateHz \+ 1e-9\)[\s\S]*samples\[sampleIndex\]\?\.absolutePressureKpa/,
  'live pressure must read a discrete observed sample without interpolating between sensor times',
);
assert.doesNotMatch(
  panelSource,
  /getPistonOscillationTrajectorySampleAt|findPistonOscillationFallingTriggerTimeS/,
  'the acquisition panel must not recover interpolated physical pressure or a continuous threshold crossing',
);
assert.match(
  panelSource,
  /const buildGuideCandidate = useCallback\(\(durationS: number\) => \{[\s\S]*!activeObservationSeries[\s\S]*triggerSourceSampleIndex === null[\s\S]*const samples = createPistonOscillationRecordedObservationSamples\([\s\S]*activeObservationSeries,[\s\S]*triggerSourceSampleIndex,[\s\S]*boundedDurationS[\s\S]*sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot\(\{[\s\S]*sampleRateHz: activeObservationSeries\.sampleRateHz,[\s\S]*triggerSourceSampleIndex/,
  'Guide candidates must contain the trigger-relative observed samples and their versioned sensor snapshot',
);
assert.match(
  panelSource,
  /targetHeightMm,[\s\S]*confirmedHeightMm: activeTrajectory\.equilibrium\.equilibriumHeightM \* 1_000/,
  'the nominal calculation height and captured physical height must remain separate',
);
assert.match(
  panelSource,
  /phase !== 'recording'[\s\S]*formalElapsedSeconds < PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S[\s\S]*buildGuideCandidate\(PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S\)[\s\S]*setStopElapsedSeconds\(candidate\.acquisitionSettings\.recordedDurationS\)[\s\S]*onGuideAcquisitionEvent\?\.\(\{ type: 'recordingReady', candidate \}\)/,
  'Guide recording should lock its displayed observation curve at the configured duration threshold',
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
  /if \(overpressurePeakKpa !== null\)[\s\S]*updatePhase\('stopped'\)[\s\S]*return;[\s\S]*onGuideAcquisitionEvent\?\.\(\{ type: 'recordingReady', candidate \}\)/,
  'only the invalid overpressure branch should stop automatically; a valid recording must still require Pause',
);
assert.match(
  panelSource,
  /const handleStop = \(\) => \{[\s\S]*buildGuideCandidate\(formalElapsedSeconds\)[\s\S]*onGuideAcquisitionEvent\?\.\(\{ type: 'curvePaused', candidate \}\)[\s\S]*updatePhase\('stopped'\)/,
  'pausing acquisition should freeze and publish the physical candidate curve',
);
assert.match(
  panelSource,
  /guideSession\.step === 'awaitingSaveOrRedo'[\s\S]*onGuideAcquisitionEvent\?\.\(\{ type: 'saveMeasurement' \}\)[\s\S]*onRunRetained\?\.\(\)/,
  'the reviewed Save action should persist the Guide measurement before notifying the workbench cycle',
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
  'formal graph bounds must use the observed post-trigger window while preset bounds remain a fallback',
);
assert.match(
  panelSource,
  /getPistonOscillationDemoTrajectory\(demoFrame\.measurementIndex\)[\s\S]*createPistonOscillationSensorObservationSeries[\s\S]*findPistonOscillationObservedFallingTriggerSample[\s\S]*createPistonOscillationRecordedObservationSamples/,
  'each demo run must pass through the same quantized sensor-observation and falling-trigger chain as Guide mode',
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
  /const markerStride = Math\.max\(1, Math\.ceil\(visibleSampleCount \/ \(plotWidth \/ 3\)\)\)[\s\S]*const markerRadius = 1\.8;[\s\S]*index \+= markerStride/,
  'ordinary sample markers should adapt to pixel density without altering the full polyline',
);
assert.match(
  panelSource,
  /className="piston-acquisition-pressure-sample-markers"[\s\S]*aria-hidden="true"/,
  'adaptive observation markers must render as a visual layer without flooding the accessibility tree',
);
assert.match(
  panelSource,
  /aria-label=\{acquisitionActive \? copy\.pause : copy\.start\}[\s\S]*aria-label=\{copy\.redo\}[\s\S]*aria-label=\{copy\.save\}/,
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
  /const guidePrimaryAllowed = !guideSelected \|\| \([\s\S]*guideActive[\s\S]*guideSession\.step === 'acquisitionReady'[\s\S]*guideSession\.step === 'pauseAvailable'[\s\S]*guidePauseReady[\s\S]*const guideSaveAllowed = Boolean\([\s\S]*guideActive[\s\S]*guideSession\.step === 'awaitingSaveOrRedo'/,
  'completion must lock both the primary acquisition action and Save',
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

console.log('pistonOscillationPresetAcquisition tests passed');
