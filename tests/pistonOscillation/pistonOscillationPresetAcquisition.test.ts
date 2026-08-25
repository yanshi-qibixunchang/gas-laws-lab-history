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
assert.match(
  appEntrySource,
  /pistonAcquisitionPreviewEnabled\s*=\s*import\.meta\.env\.DEV[\s\S]*pistonAcquisitionPreview['"]\) === ['"]1['"]/,
  'the acquisition review page must stay behind its development-only query switch',
);
assert.match(panelSource, /copy\.preTriggerNote/);
assert.doesNotMatch(panelSource, />Run 1\/7</);
assert.match(panelSource, /phaseRef\.current === 'armed'[\s\S]*updatePhase\('recording'\)/);
assert.match(panelSource, /handleStop[\s\S]*setStopElapsedSeconds\(formalElapsedSeconds\)/);
assert.match(
  panelSource,
  /const nextTrajectory = releaseEvent\.trajectory \?\? null;[\s\S]*createPistonOscillationSensorObservationSeries\([\s\S]*nextTrajectory\.samples,[\s\S]*nextTrajectory\.sampleRateHz[\s\S]*findPistonOscillationObservedFallingTriggerSample\([\s\S]*nextObservationSeries,[\s\S]*triggerKpa[\s\S]*setTriggerSeconds\(nextTriggerSeconds\);[\s\S]*setTriggerSourceSampleIndex\(nextTriggerSample\?\.sampleIndex \?\? null\);/,
  'formal acquisition must quantize the released trajectory before choosing its discrete falling-trigger sample',
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
assert.doesNotMatch(
  recordingReadyEffectSource,
  /updatePhase\('stopped'\)|updatePhase\('idle'\)/,
  'recordingReady must leave the acquisition phase recording so the user still has to press Pause',
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
assert.match(panelSource, /piston-acquisition-title[\s\S]*copy\.title/);
assert.match(
  panelSource,
  /const totalMeasurements = guideSelected[\s\S]*PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS[\s\S]*PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS[\s\S]*piston-acquisition-run-summary[\s\S]*copy\.measurement\(measurementNumber, totalMeasurements\)[\s\S]*piston-acquisition-phase/,
  'localized measurement progress should show three guide runs and no more than six free-mode runs in the compact summary',
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
assert.match(panelStyles, /\.piston-acquisition-chart-wrap\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) 36px;/);
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
assert.match(panelStyles, /\.piston-acquisition-actions\s*\{[\s\S]*width:\s*84px;[\s\S]*height:\s*28px;[\s\S]*grid-template-columns:\s*repeat\(3,\s*1fr\);[\s\S]*border-radius:\s*0;/);
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
  panelStyles,
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
  /const guidePrimaryAllowed = !guideSelected \|\| \([\s\S]*guideActive[\s\S]*guideSession\.step === 'acquisitionReady'[\s\S]*guideSession\.step === 'pauseAvailable'[\s\S]*const guideSaveAllowed = Boolean\([\s\S]*guideActive[\s\S]*guideSession\.step === 'awaitingSaveOrRedo'/,
  'completion must lock both the primary acquisition action and Save',
);
assert.match(
  panelSource,
  /guideCue === 'start' \|\| guideCue === 'pause'[\s\S]*\? 'is-guide-highlighted'[\s\S]*data-piston-guide-target="primary"[\s\S]*guideCue === 'save' \? 'is-guide-highlighted'[\s\S]*data-piston-guide-target="save"/,
  'Guide cues must highlight the exact primary or Save button rather than the entire action strip',
);
assert.match(
  panelStyles,
  /\.piston-acquisition-actions button\.is-guide-highlighted\s*\{[\s\S]*isolation:\s*isolate;[\s\S]*overflow:\s*hidden;[\s\S]*background:\s*#117db8;[\s\S]*color:\s*#fff;[\s\S]*opacity:\s*1;[\s\S]*piston-acquisition-guide-fill-pulse/,
  'the exact Guide target should use the reviewed strong blue fill',
);
assert.match(
  panelStyles,
  /\.piston-acquisition-actions button\.is-guide-highlighted::after\s*\{[\s\S]*inset:\s*2px;[\s\S]*border:\s*2px solid rgba\(255, 255, 255, 0\.78\);[\s\S]*piston-acquisition-guide-outline-pulse/,
  'the exact Guide target should carry a closed two-pixel inner outline',
);
assert.match(
  panelStyles,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*button\.is-guide-highlighted\s*\{[\s\S]*background:\s*#117db8;[\s\S]*animation:\s*none;[\s\S]*button\.is-guide-highlighted::after\s*\{[\s\S]*border-color:\s*#fff;[\s\S]*animation:\s*none;/,
  'the strong fill and closed outline must remain visible without animation in reduced-motion mode',
);

console.log('pistonOscillationPresetAcquisition tests passed');
