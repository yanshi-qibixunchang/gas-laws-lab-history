import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimeline,
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_ACTION_DURATION_MS,
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS,
  HEAT_CAPACITY_AUTO_DEMO_RECOVERY_ACTION_DURATION_MS,
  HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_ACTION_DURATION_MS,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { getHeatCapacityPreheatTotalPresentationMs } from '../../src/domain/heatCapacity/heatCapacityPreheatModel.ts';

const steps = createHeatCapacityAutoDemoSteps();
const actionSequence = steps.flatMap((step) => step.actions.map((action) => action.action));

assert.equal(steps.length, 12);
assert.equal(steps[0].id, 'power-on');
assert.equal(steps[0].title, '开启电源');
assert.equal(steps[0].description, '打开电源，使温度与压强测量系统开始工作');
assert.equal(steps[0].target, '电源开关');
assert.equal(steps[0].actions[0].action, 'powerOn');

assert.equal(steps[1].id, 'sensor-preheat');
assert.equal(steps[1].preHighlightMs, 0);
assert.equal(steps[1].actionDurationMs, getHeatCapacityPreheatTotalPresentationMs());
assert.equal(steps[1].observeDurationMs, 0);
assert.deepEqual(steps[1].actions, []);

assert.equal(steps[2].id, 'open-stopcock-for-zero');
assert.equal(steps[2].targetControlId, 'stopcock');
assert.deepEqual(steps[2].actions.map((action) => action.action), ['openStopcockForZero']);

assert.equal(steps[3].id, 'zero-pressure');
assert.equal(steps[3].targetControlId, 'pressureZero');
assert.deepEqual(
  steps[3].focusSequence?.map((focus) => [focus.targetControlId, focus.durationMs]),
  [
    ['instrumentPressureDisplay', 4_000],
    ['pressureZero', 4_000],
  ],
);
assert.deepEqual(
  steps[3].focusSequence?.map((focus) => [focus.targetControlId, focus.cameraFocusMode]),
  [
    ['instrumentPressureDisplay', 'instrument'],
    ['pressureZero', 'instrument'],
  ],
  'zero-pressure demo should drive the camera to the instrument focus view while it previews the display and knob',
);

assert.equal(actionSequence.includes('zeroPressure'), true);
assert.equal(actionSequence.includes('openStopcockForZero'), true);
assert.equal(actionSequence.filter((action) => action === 'pumpStroke').length, HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT);
assert.equal(
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
  HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
  'auto demo pumping must reuse the current standard operation stroke count',
);
assert.equal(actionSequence.includes('openStopcockForRelease'), true);
assert.equal(actionSequence.includes('closeStopcockForRecovery'), true);
assert.equal(actionSequence.includes('powerOff'), true);
assert.equal(actionSequence.includes('completeTeachingMode'), true);
const pumpPressurizeStep = steps.find((step) => step.id === 'pump-pressurize');
assert.notEqual(pumpPressurizeStep, undefined);
assert.equal(pumpPressurizeStep?.title, '连续打气加压');
assert.equal(pumpPressurizeStep?.target, '打气球');
assert.equal(
  pumpPressurizeStep?.progressCriterion,
  '打到 Uₚ ≥ 120 mV 后，关闭打气阀门进入稳定等待。',
  'auto demo should teach the visible pressure target rather than the internal stroke count',
);
assert.equal(
  pumpPressurizeStep?.note,
  '标准看 Uₚ 读数，不按打气次数判断；压强不得超过安全上限。',
);
const sealedStabilizeStep = steps.find((step) => step.id === 'sealed-stabilize');
assert.notEqual(sealedStabilizeStep, undefined);
assert.equal(sealedStabilizeStep?.progressCriterion, '等待 5 min 后记录 U₁ / Uₜ₁。');
assert.equal(sealedStabilizeStep?.note, '演示按标准操作实际等待 5 min，不压缩等待时长。');
assert.equal(
  sealedStabilizeStep?.actionDurationMs,
  HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_ACTION_DURATION_MS,
);
const thermalRecoveryStep = steps.find((step) => step.id === 'thermal-recovery');
assert.notEqual(thermalRecoveryStep, undefined);
assert.equal(thermalRecoveryStep?.progressCriterion, '等待 5 min 后记录 U₂ / Uₜ₂。');
assert.equal(
  thermalRecoveryStep?.actionDurationMs,
  HEAT_CAPACITY_AUTO_DEMO_RECOVERY_ACTION_DURATION_MS,
);
assert.equal(
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS,
  HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS * 1000,
);
assert.equal(
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS,
  HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS * 1000,
);
assert.equal(
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS,
  Math.round(
    (HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS * 1000) /
      (HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes - 1),
  ),
  'auto demo pumping cadence must preserve the standard operation pump window',
);
assert.deepEqual(
  pumpPressurizeStep?.actions
    .filter((action) => action.action === 'pumpStroke')
    .map((action) => action.delayMs ?? 0),
  Array.from(
    { length: HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT },
    (_, index) => index * HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS,
  ),
);
assert.equal(
  pumpPressurizeStep?.actions.find((action) => action.sampleKey === 'pumpPeakSample')?.delayMs,
  (HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT - 1) * HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS + 300,
);
assert.deepEqual(
  steps.flatMap((step) => step.actions.map((action) => action.sampleKey).filter(Boolean)),
  ['zeroedSample', 'pumpPeakSample', 'stableBeforeReleaseSample', 'releaseLowSample', 'recoverySample'],
);
assert.equal(steps.every((step) => step.id === 'sensor-preheat' ? step.preHighlightMs === 0 : step.id === 'zero-pressure' ? step.preHighlightMs === 8_000 : step.preHighlightMs === 4_000), true);
assert.equal(steps.every((step) => step.id === 'sensor-preheat' || step.id === 'power-on' ? step.observeDurationMs === 0 : step.observeDurationMs === 3_000), true);
const releaseStep = steps.find((step) => step.id === 'release-and-close-stopcock');
assert.notEqual(releaseStep, undefined);
assert.equal(steps.some((step) => step.targetControlId === 'pressureZero'), true);
assert.equal(
  steps.some((step) => step.focusSequence?.some((focus) => focus.targetControlId === 'instrumentPressureDisplay')),
  true,
);
assert.equal(steps[2].actionDurationMs, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs);
assert.equal(steps[4].actionDurationMs, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs);
assert.equal(releaseStep?.actionDurationMs, HEAT_CAPACITY_AUTO_DEMO_RELEASE_ACTION_DURATION_MS);
assert.equal(
  releaseStep?.actions.find((action) => action.action === 'closeStopcockForRecovery')?.delayMs,
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS,
);
assert.equal(
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS - HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs,
  HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1000,
);
assert.deepEqual(
  steps.map((step) => [step.id, step.cameraFocusMode]),
  [
    ['power-on', 'instrument'],
    ['sensor-preheat', undefined],
    ['open-stopcock-for-zero', 'bottle'],
    ['zero-pressure', 'instrument'],
    ['close-stopcock-before-pump', 'bottle'],
    ['open-pump-valve', 'bottle'],
    ['pump-pressurize', 'pump'],
    ['close-pump-valve', 'bottle'],
    ['sealed-stabilize', 'instrument'],
    ['release-and-close-stopcock', 'bottle'],
    ['thermal-recovery', 'instrument'],
    ['power-off', 'instrument'],
  ],
  'auto demo should script camera focus modes for each visible instrument operation',
);

const timeline = getHeatCapacityAutoDemoTimeline(steps);
assert.equal(timeline[0].stage, 'highlight');
assert.equal(timeline[0].step.id, 'power-on');
assert.equal(timeline[1].stage, 'action');
assert.equal(timeline[2].stage, 'preview');
assert.equal(timeline[2].step.id, 'sensor-preheat');
assert.equal(timeline.some((item) => item.stage === 'preview'), true);
assert.equal(
  timeline.some((item) => item.stage === 'observe' && item.stepIndex < steps.length - 1),
  false,
  'auto demo panel should not stay on a completed operation during the waiting window',
);

const closePumpValveAtMs = timeline.find(
  (item) => item.action?.action === 'closePumpValve',
)?.atMs;
const stableSampleAtMs = timeline.find(
  (item) => item.action?.sampleKey === 'stableBeforeReleaseSample',
)?.atMs;
const closePumpValveStep = steps.find((step) => step.id === 'close-pump-valve');
assert.equal(typeof closePumpValveAtMs, 'number');
assert.equal(typeof stableSampleAtMs, 'number');
assert.equal(
  (stableSampleAtMs ?? 0) - ((closePumpValveAtMs ?? 0) + (closePumpValveStep?.actionDurationMs ?? 0)),
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS,
  'auto demo must wait the full standard interval after the pump valve has finished closing',
);

const closeStopcockAtMs = timeline.find(
  (item) => item.action?.action === 'closeStopcockForRecovery',
)?.atMs;
const recoverySampleAtMs = timeline.find(
  (item) => item.action?.sampleKey === 'recoverySample',
)?.atMs;
assert.equal(typeof closeStopcockAtMs, 'number');
assert.equal(typeof recoverySampleAtMs, 'number');
assert.equal(
  (recoverySampleAtMs ?? 0) - (
    (closeStopcockAtMs ?? 0) + HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs
  ),
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS,
  'auto demo must wait the full standard interval after the stopcock has finished closing',
);

const zeroPressureFirstHighlight = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight');
const zeroPressurePreview = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'preview');
const openStopcockFirstHighlight = timeline.find((item) => item.step.id === 'open-stopcock-for-zero' && item.stage === 'highlight');
const openStopcockPreview = timeline.find((item) => item.step.id === 'open-stopcock-for-zero' && item.stage === 'preview');
assert.equal(typeof zeroPressureFirstHighlight?.atMs, 'number');
assert.equal(
  openStopcockFirstHighlight?.atMs,
  openStopcockPreview?.atMs,
);
assert.equal(
  zeroPressurePreview?.atMs,
  (openStopcockFirstHighlight?.atMs ?? 0) + steps[2].preHighlightMs + steps[2].actionDurationMs,
);

assert.deepEqual(
  timeline.filter((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight').map((item) => [item.focusControlId, item.atMs]),
  [
    ['instrumentPressureDisplay', 17_670],
    ['pressureZero', 21_670],
  ],
);
assert.deepEqual(
  timeline.filter((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight').map((item) => [item.focusControlId, item.cameraFocusMode]),
  [
    ['instrumentPressureDisplay', 'instrument'],
    ['pressureZero', 'instrument'],
  ],
  'zero-pressure focus sequence should carry camera focus through the generated timeline',
);
assert.equal(
  timeline.filter((item) => item.step.id === 'pump-pressurize' && item.stage === 'action').every((item) => item.cameraFocusMode === 'pump'),
  true,
  'pump actions should keep the camera on the pump focus view until the operation window ends',
);
assert.equal(
  timeline.filter((item) => item.stage === 'preview').every((item) => item.cameraFocusMode === undefined),
  true,
  'preview gaps should release scripted demo camera focus so the scene can return to default view',
);
assert.equal(timeline.every((item, index) => index === 0 || item.atMs >= timeline[index - 1].atMs), true);
assert.equal(timeline.at(-1)?.step.id, 'power-off');
assert.equal(timeline.at(-1)?.action?.action, 'completeTeachingMode');
assert.equal((timeline.at(-1)?.atMs ?? 0) > 10 * 60 * 1000, true);

console.log('heatCapacityAutoDemo tests passed');
