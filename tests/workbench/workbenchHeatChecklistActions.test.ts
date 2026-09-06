import assert from 'node:assert/strict';
import { createWorkbenchHeatChecklistActions } from '../../src/features/workbench/workbenchHeatChecklistActions.ts';
import { HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS } from '../../src/features/workbench/workbenchHeatCapacityGuidePresentation.ts';
import { HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS, HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS } from '../../src/features/workbench/workbenchTeachingUiTiming.ts';

let nextId = 1;
const timers = new Map<number, { delay: number; run: () => void }>();
const frames = new Map<number, FrameRequestCallback>();
const oldWindow = globalThis.window;
globalThis.window = {
  requestAnimationFrame: (run: FrameRequestCallback) => { const id = nextId++; frames.set(id, run); return id; },
  cancelAnimationFrame: (id: number) => { frames.delete(id); },
  setTimeout: (run: () => void, delay: number) => { const id = nextId++; timers.set(id, { delay, run }); return id; },
  clearTimeout: (id: number) => { timers.delete(id); },
} as unknown as Window & typeof globalThis;
try {
  const styles = new Map<string, string>();
  let snapping = false;
  const viewed = { current: 0 };
  const visual = { current: 0 };
  const current = { current: 4 };
  const frame = { current: null as number | null };
  const snap = { current: null as number | null };
  const back = { current: null as number | null };
  const pending = { current: 0 };
  let visibleIndex = 0;
  const actions = createWorkbenchHeatChecklistActions({
    HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX: 48,
    HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX: 42,
    heatCapacityGuideChecklistViewedIndexRef: viewed,
    heatCapacityGuideChecklistVisualOffsetRef: visual,
    heatCapacityGuideChecklistCurrentIndexRef: current,
    heatCapacityGuideChecklistFrameRef: frame,
    heatCapacityGuideChecklistSnapTimerRef: snap,
    heatCapacityGuideChecklistReturnTimerRef: back,
    heatCapacityGuideChecklistPendingWheelDeltaRef: pending,
    heatCapacityGuideChecklistTrackRef: { current: {
      style: { setProperty: (key: string, value: string) => styles.set(key, value) },
      classList: { toggle: (_name: string, enabled: boolean) => { snapping = enabled; } },
    } as unknown as HTMLDivElement },
    setHeatCapacityGuideChecklistViewedIndex: (next) => { visibleIndex = typeof next === 'function' ? next(visibleIndex) : next; },
  });
  let prevented = 0;
  let stopped = 0;
  const wheel = (deltaY: number, deltaMode = 0) => actions.handleHeatCapacityGuideChecklistWheel({
    deltaY, deltaMode, preventDefault: () => prevented++, stopPropagation: () => stopped++,
  } as unknown as React.WheelEvent<HTMLDivElement>);
  wheel(500);
  wheel(500);
  assert.equal(frames.size, 1, 'Rapid wheel events share one scheduled frame');
  for (const [id, run] of [...frames]) { frames.delete(id); run(0); }
  assert.equal(viewed.current, 2, 'A burst cannot skip more than two rows in one frame');
  assert.equal(visibleIndex, 2);
  assert.equal(pending.current, 0);
  assert.ok(Math.abs(visual.current) < 24);
  assert.equal(snapping, false);
  assert.equal(prevented, 2);
  assert.equal(stopped, 2);
  for (const [id, timer] of [...timers]) if (timer.delay === HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS) { timers.delete(id); timer.run(); }
  assert.equal(visual.current, 0);
  assert.equal(viewed.current, 2, 'Snapping cannot jump back before the return delay');
  assert.equal(snapping, true);
  for (const [id, timer] of [...timers]) if (timer.delay === HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS) { timers.delete(id); timer.run(); }
  assert.equal(viewed.current, 4);
  assert.equal(styles.get('--studio-heat-guide-step-base-offset'), '-150px');
  actions.applyHeatCapacityGuideChecklistView(999, 1000);
  assert.equal(viewed.current, HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1);
  assert.equal(visual.current, 48 * 0.48);
  wheel(-2, 1);
  actions.clearHeatCapacityGuideChecklistTimers();
  assert.equal(frames.size, 0);
  assert.equal(timers.size, 0);
  assert.equal(frame.current, null);
  assert.equal(snap.current, null);
  assert.equal(back.current, null);
} finally {
  globalThis.window = oldWindow;
}
console.log('Workbench Heat checklist resource tests passed.');
