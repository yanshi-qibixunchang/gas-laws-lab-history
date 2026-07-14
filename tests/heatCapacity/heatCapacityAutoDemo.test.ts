import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  deriveHeatCapacityAutoDemoZeroKnobMotion,
  deriveHeatCapacityAutoDemoWaitTimer,
  getHeatCapacityAutoDemoTimeline,
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_ACTION_DURATION_MS,
  HEAT_CAPACITY_AUTO_DEMO_RELEASE_CLOSE_DELAY_MS,
  HEAT_CAPACITY_AUTO_DEMO_RECOVERY_SAMPLE_DELAY_MS,
  HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_SAMPLE_DELAY_MS,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
  HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  FREE_PUMP_STROKE_DURATION_S,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
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
assert.equal(sealedStabilizeStep?.note, '演示使用固定 ×16 倍速展示完整 5 min 计时，结束后自动记录稳定读数。');
assert.deepEqual(sealedStabilizeStep?.wait, {
  stage: 'u1',
  targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
  speedMultiplier: 16,
  sampleKey: 'stableBeforeReleaseSample',
});
assert.equal(
  sealedStabilizeStep?.actionDurationMs,
  HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_SAMPLE_DELAY_MS + HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS,
);
assert.equal(
  sealedStabilizeStep?.actions.find((action) => action.sampleKey === 'stableBeforeReleaseSample')?.delayMs,
  HEAT_CAPACITY_AUTO_DEMO_STABILIZATION_SAMPLE_DELAY_MS,
);
const thermalRecoveryStep = steps.find((step) => step.id === 'thermal-recovery');
assert.notEqual(thermalRecoveryStep, undefined);
assert.equal(thermalRecoveryStep?.progressCriterion, '等待 5 min 后记录 U₂ / Uₜ₂。');
assert.equal(thermalRecoveryStep?.note, '演示使用固定 ×16 倍速展示完整 5 min 计时，结束后自动记录回温读数。');
assert.deepEqual(thermalRecoveryStep?.wait, {
  stage: 'u2',
  targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS,
  speedMultiplier: 16,
  sampleKey: 'recoverySample',
});
assert.equal(
  thermalRecoveryStep?.actionDurationMs,
  HEAT_CAPACITY_AUTO_DEMO_RECOVERY_SAMPLE_DELAY_MS + HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS,
);
assert.equal(
  thermalRecoveryStep?.actions.find((action) => action.sampleKey === 'recoverySample')?.delayMs,
  HEAT_CAPACITY_AUTO_DEMO_RECOVERY_SAMPLE_DELAY_MS,
);
assert.equal(HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER, 16);
assert.equal(
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS,
  HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS * 1000,
);
assert.equal(
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS,
  HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS * 1000,
);
assert.equal(HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS, 8);
assert.equal(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S, 8 / 17);
assert.deepEqual(
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS,
  Array.from(
    { length: HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT },
    (_, index) => Math.round(
      index * HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1000,
    ),
  ),
  'auto demo must round each exact 8/17 s timestamp independently',
);
assert.deepEqual(
  pumpPressurizeStep?.actions
    .filter((action) => action.action === 'pumpStroke')
    .map((action) => action.delayMs ?? 0),
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS,
);
assert.equal(HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS[0], 0);
assert.equal(
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS[
    HEAT_CAPACITY_TEACHING_PUMP_STROKE_DELAYS_MS.length - 1
  ],
  8_000,
  'the eighteenth pump stroke must start exactly 8 s after the first stroke',
);
assert.equal(
  HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS + FREE_PUMP_STROKE_DURATION_S,
  8.08,
  'the eighteenth 0.08 s stroke must complete at 8.08 s',
);
assert.equal(
  pumpPressurizeStep?.actions.find((action) => action.sampleKey === 'pumpPeakSample')?.delayMs,
  8_300,
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
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS / HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
  'auto demo should present the full standard U1 interval at fixed ×16 wall-clock speed',
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
  HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_RELEASE_MS / HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
  'auto demo should present the full standard U2 interval at fixed ×16 wall-clock speed',
);

const sealedWaitStartedAtMs = timeline.find((item) => (
  item.stage === 'preview' && item.step.id === 'sealed-stabilize'
))?.atMs;
assert.equal(typeof sealedWaitStartedAtMs, 'number');
assert.equal(deriveHeatCapacityAutoDemoWaitTimer(timeline, (sealedWaitStartedAtMs ?? 0) - 1), null);
assert.deepEqual(deriveHeatCapacityAutoDemoWaitTimer(timeline, sealedWaitStartedAtMs ?? 0), {
  stage: 'u1',
  elapsedS: 0,
  targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
  speedMultiplier: 16,
  phase: 'active',
});
assert.deepEqual(
  deriveHeatCapacityAutoDemoWaitTimer(
    timeline,
    (sealedWaitStartedAtMs ?? 0) + HEAT_CAPACITY_AUTO_DEMO_WAIT_AFTER_PUMP_MS / 32,
  ),
  {
    stage: 'u1',
    elapsedS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS / 2,
    targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
    speedMultiplier: 16,
    phase: 'active',
  },
);
assert.deepEqual(deriveHeatCapacityAutoDemoWaitTimer(timeline, stableSampleAtMs ?? 0), {
  stage: 'u1',
  elapsedS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
  targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
  speedMultiplier: 16,
  phase: 'exiting',
});
assert.equal(
  deriveHeatCapacityAutoDemoWaitTimer(
    timeline,
    (stableSampleAtMs ?? 0) + HEAT_CAPACITY_AUTO_DEMO_WAIT_EXIT_DURATION_MS,
  ),
  null,
  'the auto-demo wait controller should unmount after its short exit animation',
);

const zeroPressureFirstHighlight = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight');
const zeroPressureAction = timeline.find((item) => item.action?.action === 'zeroPressure');
const zeroPressurePreview = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'preview');
const openStopcockFirstHighlight = timeline.find((item) => item.step.id === 'open-stopcock-for-zero' && item.stage === 'highlight');
const openStopcockPreview = timeline.find((item) => item.step.id === 'open-stopcock-for-zero' && item.stage === 'preview');
assert.equal(typeof zeroPressureFirstHighlight?.atMs, 'number');
assert.equal(typeof zeroPressureAction?.atMs, 'number');
assert.deepEqual(
  deriveHeatCapacityAutoDemoZeroKnobMotion(timeline, (zeroPressureAction?.atMs ?? 0) - 1, -180),
  { angleDeg: 0, progress: 0, timelineDriven: false },
  'the scripted zero knob should remain at its start angle before the zero action',
);
assert.deepEqual(
  deriveHeatCapacityAutoDemoZeroKnobMotion(
    timeline,
    (zeroPressureAction?.atMs ?? 0) + HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS / 2,
    -180,
  ),
  { angleDeg: -90, progress: 0.5, timelineDriven: true },
  'the scripted knob angle and tick clock should share one deterministic timeline',
);
assert.deepEqual(
  deriveHeatCapacityAutoDemoZeroKnobMotion(
    timeline,
    (zeroPressureAction?.atMs ?? 0) + HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS,
    -180,
  ),
  { angleDeg: -180, progress: 1, timelineDriven: true },
  'the scripted zero motion should reach the logical knob angle before U0 capture',
);
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
assert.equal((timeline.at(-1)?.atMs ?? 0) < 3 * 60 * 1000, true, 'fixed ×16 waits should keep the full demo under three minutes');

console.log('heatCapacityAutoDemo tests passed');
