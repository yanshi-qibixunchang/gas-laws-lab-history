import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimeline,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const steps = createHeatCapacityAutoDemoSteps();
const actionSequence = steps.flatMap((step) => step.actions.map((action) => action.action));

assert.equal(steps.length, 11);
assert.equal(steps[0].id, 'power-on');
assert.equal(steps[0].title, '开启电源');
assert.equal(steps[0].description, '打开电源，使温度与压强测量系统开始工作');
assert.equal(steps[0].target, '电源开关');
assert.equal(steps[0].actions[0].action, 'powerOn');

assert.equal(steps[1].id, 'open-stopcock-for-zero');
assert.equal(steps[1].targetControlId, 'stopcock');
assert.deepEqual(steps[1].actions.map((action) => action.action), ['openStopcockForZero']);

assert.equal(steps[2].id, 'zero-pressure');
assert.equal(steps[2].targetControlId, 'pressureZero');
assert.deepEqual(
  steps[2].focusSequence?.map((focus) => [focus.targetControlId, focus.durationMs]),
  [
    ['instrumentPressureDisplay', 4_000],
    ['pressureZero', 4_000],
  ],
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
assert.equal(actionSequence.includes('markDemoComplete'), true);
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
const thermalRecoveryStep = steps.find((step) => step.id === 'thermal-recovery');
assert.notEqual(thermalRecoveryStep, undefined);
assert.equal(thermalRecoveryStep?.progressCriterion, '等待 5 min 后记录 U₂ / Uₜ₂。');
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
assert.equal(steps.every((step) => step.id === 'zero-pressure' ? step.preHighlightMs === 8_000 : step.preHighlightMs === 4_000), true);
assert.equal(steps.every((step) => step.observeDurationMs === 3_000), true);
assert.equal(steps[8].id, 'release-and-close-stopcock');
assert.equal(steps.some((step) => step.targetControlId === 'pressureZero'), true);
assert.equal(
  steps.some((step) => step.focusSequence?.some((focus) => focus.targetControlId === 'instrumentPressureDisplay')),
  true,
);
assert.equal(steps.some((step) => step.targetControlId === 'stopcock' && step.actionDurationMs === 1_000), true);

const timeline = getHeatCapacityAutoDemoTimeline(steps);
assert.equal(timeline[0].stage, 'highlight');
assert.equal(timeline[0].step.id, 'power-on');
assert.equal(timeline[1].stage, 'action');
assert.equal(timeline[2].stage, 'preview');
assert.equal(timeline[2].step.id, 'open-stopcock-for-zero');
assert.equal(timeline.some((item) => item.stage === 'preview'), true);
assert.equal(
  timeline.some((item) => item.stage === 'observe' && item.stepIndex < steps.length - 1),
  false,
  'auto demo panel should not stay on a completed operation during the waiting window',
);

const zeroPressureFirstHighlight = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight');
const zeroPressurePreview = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'preview');
const openStopcockFirstHighlight = timeline.find((item) => item.step.id === 'open-stopcock-for-zero' && item.stage === 'highlight');
const openStopcockPreview = timeline.find((item) => item.step.id === 'open-stopcock-for-zero' && item.stage === 'preview');
assert.equal(typeof zeroPressureFirstHighlight?.atMs, 'number');
assert.equal(openStopcockPreview?.atMs, steps[0].preHighlightMs + steps[0].actionDurationMs);
assert.equal(
  zeroPressurePreview?.atMs,
  (openStopcockFirstHighlight?.atMs ?? 0) + steps[1].preHighlightMs + steps[1].actionDurationMs,
);

assert.deepEqual(
  timeline.filter((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight').map((item) => [item.focusControlId, item.atMs]),
  [
    ['instrumentPressureDisplay', 15_650],
    ['pressureZero', 19_650],
  ],
);
assert.equal(timeline.every((item, index) => index === 0 || item.atMs >= timeline[index - 1].atMs), true);
assert.equal(timeline.at(-1)?.step.id, 'power-off');
assert.equal(timeline.at(-1)?.action?.action, 'markDemoComplete');
assert.equal((timeline.at(-1)?.atMs ?? 0) >= 105_000, true);
assert.equal((timeline.at(-1)?.atMs ?? 0) <= 110_000, true);

console.log('heatCapacityAutoDemo tests passed');
