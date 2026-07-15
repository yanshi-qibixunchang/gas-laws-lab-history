import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  getHeatCapacityAutoDemoTimelineItemKey,
  getHeatCapacityAutoDemoTimeline,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  normalizeHeatCapacityAutoDemoResumeCursor,
} from '../../src/features/heatCapacity/heatCapacityAutoDemoPreheatResume.ts';

const timeline = getHeatCapacityAutoDemoTimeline(createHeatCapacityAutoDemoSteps());
const preheatStartIndex = timeline.findIndex((item) => (
  item.step.id === 'sensor-preheat' && item.stage === 'highlight'
));
const preheatEndItem = timeline.find((item) => (
  item.stage === 'preview' && item.step.id === 'open-stopcock-for-zero'
));

assert.notEqual(preheatStartIndex, -1);
assert.notEqual(preheatEndItem, undefined);

const preheatStartedAtMs = timeline[preheatStartIndex]!.atMs;
const preheatMidpointElapsedMs = preheatStartedAtMs + 2_500;
let preheatMidpointIndex = -1;
timeline.forEach((item, index) => {
  if (item.atMs <= preheatMidpointElapsedMs) preheatMidpointIndex = index;
});
const executedAtMidpoint = timeline
  .slice(0, preheatMidpointIndex + 1)
  .map(getHeatCapacityAutoDemoTimelineItemKey);

const restarted = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
  elapsedMs: preheatMidpointElapsedMs,
  currentItemIndex: preheatMidpointIndex,
  currentStepId: 'sensor-preheat',
  executedItemKeys: executedAtMidpoint,
});

assert.equal(restarted.restartedInterruptedPreheat, true);
assert.equal(restarted.elapsedMs, preheatStartedAtMs, 'the visible 10 min breakpoint must return to 0 min');
assert.equal(restarted.lastProcessedTimelineIndex, preheatStartIndex - 1);
assert.deepEqual(
  restarted.executedItemKeys,
  timeline.slice(0, preheatStartIndex).map(getHeatCapacityAutoDemoTimelineItemKey),
);
assert.equal(
  restarted.executedItemKeys.some((key) => key.includes(':power-on:action:powerOn:')),
  true,
  'the already completed power-on action must remain consumed',
);
assert.equal(
  restarted.executedItemKeys.includes(
    getHeatCapacityAutoDemoTimelineItemKey(timeline[preheatStartIndex]!, preheatStartIndex),
  ),
  false,
  'the preheat highlight that starts the presentation must be eligible to run again',
);
assert.equal(
  (preheatEndItem?.atMs ?? 0) - restarted.elapsedMs,
  5_600,
  'the resumed Demo must retain the complete 5 s presentation and 600 ms completion hold',
);

const nextStepIndex = timeline.findIndex((item) => item.step.id === 'open-stopcock-for-zero');
const unchanged = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
  elapsedMs: timeline[nextStepIndex]!.atMs,
  currentItemIndex: nextStepIndex,
  currentStepId: 'open-stopcock-for-zero',
  executedItemKeys: ['already-executed'],
});
assert.deepEqual(unchanged, {
  restartedInterruptedPreheat: false,
  elapsedMs: timeline[nextStepIndex]!.atMs,
  lastProcessedTimelineIndex: nextStepIndex,
  executedItemKeys: ['already-executed'],
});

const inconsistentIndex = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
  elapsedMs: preheatMidpointElapsedMs,
  currentItemIndex: null,
  currentStepId: 'sensor-preheat',
  executedItemKeys: [],
});
assert.equal(
  inconsistentIndex.restartedInterruptedPreheat,
  true,
  'a decoded checkpoint may use its semantic step id when the numeric cursor is absent',
);

console.log('heatCapacityAutoDemoPreheatResume tests passed');
