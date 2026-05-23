import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimeline,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT,
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';

const steps = createHeatCapacityAutoDemoSteps();
const actionSequence = steps.flatMap((step) => step.actions.map((action) => action.action));

assert.equal(steps.length, 11);
assert.equal(steps[0].id, 'power-on');
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
assert.equal(actionSequence.includes('openStopcockForRelease'), true);
assert.equal(actionSequence.includes('closeStopcockForRecovery'), true);
assert.equal(actionSequence.includes('powerOff'), true);
assert.equal(actionSequence.includes('markDemoComplete'), true);
const pumpPressurizeStep = steps.find((step) => step.id === 'pump-pressurize');
assert.notEqual(pumpPressurizeStep, undefined);
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
  HEAT_CAPACITY_TEACHING_PUMP_STROKE_COUNT * HEAT_CAPACITY_TEACHING_PUMP_STROKE_INTERVAL_MS + 300,
);
assert.deepEqual(
  steps.flatMap((step) => step.actions.map((action) => action.sampleKey).filter(Boolean)),
  ['zeroedSample', 'pumpPeakSample', 'stableBeforeReleaseSample', 'releaseLowSample', 'recoverySample'],
);
assert.equal(steps.every((step) => step.id === 'zero-pressure' ? step.preHighlightMs === 8_000 : step.preHighlightMs === 5_000), true);
assert.equal(steps[0].observeDurationMs, 4_000);
assert.equal(steps.slice(1).every((step) => step.observeDurationMs === 6_000), true);
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
assert.equal(timeline[2].stage, 'observe');
assert.equal(timeline.some((item) => item.stage === 'preview'), true);

const zeroPressureFirstHighlight = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight');
const zeroPressurePreview = timeline.find((item) => item.step.id === 'zero-pressure' && item.stage === 'preview');
assert.equal(typeof zeroPressureFirstHighlight?.atMs, 'number');
assert.equal(zeroPressurePreview?.atMs, (zeroPressureFirstHighlight?.atMs ?? 0) - 1_000);

assert.deepEqual(
  timeline.filter((item) => item.step.id === 'zero-pressure' && item.stage === 'highlight').map((item) => [item.focusControlId, item.atMs]),
  [
    ['instrumentPressureDisplay', 21_650],
    ['pressureZero', 25_650],
  ],
);
assert.equal(timeline.every((item, index) => index === 0 || item.atMs >= timeline[index - 1].atMs), true);
assert.equal(timeline.at(-1)?.step.id, 'power-off');
assert.equal(timeline.at(-1)?.action?.action, 'markDemoComplete');
assert.equal((timeline.at(-1)?.atMs ?? 0) >= 134_000, true);
assert.equal((timeline.at(-1)?.atMs ?? 0) <= 142_000, true);

console.log('heatCapacityAutoDemo tests passed');


