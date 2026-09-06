import { useWorkbenchHeatDemoState } from '../../src/features/workbench/useWorkbenchHeatDemoState.ts';
import { createWorkbenchHeatDemoUiActions } from '../../src/features/workbench/workbenchHeatDemoUiActions.ts';
import { getHeatCapacityRealtimeCopy } from '../../src/features/workbench/workbenchHeatCapacityRealtimeCopy.ts';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useWorkbenchHeatPumpAnimation } from '../../src/features/workbench/useWorkbenchHeatPumpAnimation.ts';
import { useWorkbenchHeatRealtimeClock } from '../../src/features/workbench/useWorkbenchHeatRealtimeClock.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { HEAT_CAPACITY_QUALITY_PROFILES } from '../../src/features/heatCapacity/heatCapacityQualityProfiles.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

function captureHook<T>(hook: () => T): T {
  let result: T | undefined;
  function Probe() { result = hook(); return null; }
  renderToString(React.createElement(Probe));
  assert.notEqual(result, undefined);
  return result as T;
}
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalNow = Date.now;
let now = 1_000;
let nextTimer = 1;
const timers = new Map<number, { callback: () => void; delay: number }>();
const intervals = new Map<number, { callback: () => void; delay: number }>();
const clearedIntervals: number[] = [];
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  setTimeout(callback: () => void, delay: number) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id: number) { timers.delete(id); },
  setInterval(callback: () => void, delay: number) { const id = nextTimer++; intervals.set(id, { callback, delay }); return id; },
  clearInterval(id: number) { clearedIntervals.push(id); intervals.delete(id); },
} });
Date.now = () => now;
try {
  const file = createDefaultHeatCapacityFile(1);
  const desktopExitQuiescedRef = { current: false };
  const heatCapacityRefreshRestorePendingRef = { current: false };
  const heatCapacityRuntimeFailureFileIdRef = { current: null as string | null };
  const activeFileIdRef = { current: file.id };
  let liveFile: WorkbenchFileState = file;
  let commits = 0;
  const pump = captureHook(() => useWorkbenchHeatPumpAnimation({
    desktopExitQuiescedRef, heatCapacityRefreshRestorePendingRef,
    heatCapacityRuntimeFailureFileIdRef, activeFileIdRef, activeFile: file,
    heatCapacityRefreshRestoring: false, heatCapacityLessonDialogActive: false, autoDemoPaused: false,
    updateFileById(fileId, update) { assert.equal(fileId, file.id); commits++; liveFile = update(liveFile); },
  }));
  assert.equal(timers.size, 0, 'constructing the controller must not start resources before its installation phase');
  pump.scheduleHeatCapacityPumpAnimation(file.id, 100, 200);
  const resource = pump.heatCapacityPumpAnimationRef.current;
  now += 20;
  pump.pauseHeatCapacityPumpAnimation(file.id);
  assert.equal(pump.heatCapacityPumpAnimationRef.current, resource, 'pause preserves the one resource ref');
  assert.equal(resource.pausedReleaseRemainingMs, 80);
  assert.equal(resource.pausedIdleRemainingMs, 180);
  assert.equal(timers.size, 0);
  now += 5_000;
  pump.resumeHeatCapacityPumpAnimation('obsolete-file');
  assert.equal(timers.size, 0, 'a different file cannot resume the frozen pump');
  pump.resumeHeatCapacityPumpAnimation(file.id);
  assert.deepEqual([...timers.values()].map(t => t.delay), [80, 180]);
  [...timers.values()][0].callback();
  assert.equal(liveFile.kind === 'heatCapacity' ? liveFile.pumpBulbState : null, 'releasing');
  pump.clearHeatCapacityPumpAnimationTimers();
  assert.equal(resource.fileId, null);
  assert.equal(resource.pausedIdleRemainingMs, null);

  for (const gate of ['desktop', 'restore', 'runtime', 'file'] as const) {
    pump.scheduleHeatCapacityPumpAnimation(file.id, 100, 200);
    const queued = [...timers.values()].map(t => t.callback);
    if (gate === 'desktop') desktopExitQuiescedRef.current = true;
    if (gate === 'restore') heatCapacityRefreshRestorePendingRef.current = true;
    if (gate === 'runtime') heatCapacityRuntimeFailureFileIdRef.current = file.id;
    if (gate === 'file') activeFileIdRef.current = 'different-file';
    const before = commits;
    queued.forEach(callback => callback());
    assert.equal(commits, before, gate + ' must reject both late release and idle callbacks');
    pump.clearHeatCapacityPumpAnimationTimers();
    timers.clear();
    desktopExitQuiescedRef.current = false;
    heatCapacityRefreshRestorePendingRef.current = false;
    heatCapacityRuntimeFailureFileIdRef.current = null;
    activeFileIdRef.current = file.id;
  }

  const demoState = captureHook(() => useWorkbenchHeatDemoState({
    initialHeatCapacityRefreshSession: null, heatCapacityModeTransitionLocked: false,
    heatCapacityRefreshRestoring: false, desktopExitQuiesced: false,
    heatCapacityRuntimeFailureFileId: null,
  }));
  let modalLocked = true;
  const toasts: string[] = [];
  const demoUiPorts = {
    scene: { heatCapacityModeTransitionLocked: false, setHeatCapacityFocusResetKey: () => {}, heatCapacityFocusSessionRef: { current: null } },
    demoState,
    feedback: { heatCapacityRealtimeCopy: getHeatCapacityRealtimeCopy('zh-CN'), showHeatCapacityToast: (message: string) => { toasts.push(message); } },
    ui: { isHeatCapacityModalLocked: () => modalLocked },
    workspace: { activeFile: file }, guideState: { setGuideHeatCapacityRollback: () => {} },
  };
  const demoUi = createWorkbenchHeatDemoUiActions(demoUiPorts);
  demoUi.scheduleHeatCapacityAutoDemoLockedPointerToast();
  assert.notEqual(demoState.heatCapacityAutoDemoLockedPointerToastTimerRef.current, null);
  demoUi.handleHeatCapacitySceneLockedInteraction('locked');
  assert.equal(demoState.heatCapacityAutoDemoLockedPointerToastTimerRef.current, null, 'scene interception cancels fallback before checking modal ownership');
  assert.deepEqual(toasts, []);
  modalLocked = false;
  demoUi.handleHeatCapacitySceneLockedInteraction('locked');
  assert.deepEqual(toasts, ['locked'], 'the same command reads modal ownership when invoked');
  demoUi.handleHeatCapacitySceneLockedInteraction('locked');
  assert.deepEqual(toasts, ['locked'], 'same-message deduplication retains its deadline');
  const transitionUi = createWorkbenchHeatDemoUiActions({ ...demoUiPorts, scene: { ...demoUiPorts.scene, heatCapacityModeTransitionLocked: true } });
  transitionUi.handleHeatCapacitySceneLockedInteraction('transition');
  assert.deepEqual(toasts, ['locked'], 'transition interception stays silent');

  let files: WorkbenchFileState[] = [file, createDefaultHeatCapacityFile(2)];
  const filesRef = { current: files };
  const heatCapacityLessonDialogActiveRef = { current: false };
  const heatCapacityLessonPausedFileIdRef = { current: null as string | null };
  let setterCalls = 0;
  const clockPorts = {
    desktopExitQuiesced: false, heatCapacityRefreshRestoring: false,
    heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileId: null,
    desktopExitQuiescedRef, activeFileIdRef,
    heatCapacityRefreshActiveFileIdRef: { current: file.id },
    heatCapacityRuntimeFailureFileIdRef, heatCapacityLessonPausedFileIdRef,
    heatCapacityLessonDialogActiveRef, filesRef,
    heatCapacityQualityProfile: HEAT_CAPACITY_QUALITY_PROFILES.balanced,
    setFiles(update: React.SetStateAction<WorkbenchFileState[]>) {
      setterCalls++; files = typeof update === 'function' ? update(files) : update;
    },
  };
  const clock = useWorkbenchHeatRealtimeClock(clockPorts);
  assert.equal(intervals.size, 0, 'collecting the clock effect does not install it early');
  const cleanup = clock.effects.realtimeClock.run();
  assert.equal(intervals.size, 1);
  const [clockId, interval] = [...intervals.entries()][0];
  assert.equal(interval.delay, HEAT_CAPACITY_QUALITY_PROFILES.balanced.tickIntervalMs);
  desktopExitQuiescedRef.current = true;
  interval.callback();
  assert.equal(setterCalls, 0, 'a queued clock must stop before touching file state during desktop exit');
  desktopExitQuiescedRef.current = false;
  for (const gate of ['restore', 'runtime', 'lesson', 'lesson-file'] as const) {
    const before = files;
    if (gate === 'restore') heatCapacityRefreshRestorePendingRef.current = true;
    if (gate === 'runtime') heatCapacityRuntimeFailureFileIdRef.current = file.id;
    if (gate === 'lesson') heatCapacityLessonDialogActiveRef.current = true;
    if (gate === 'lesson-file') heatCapacityLessonPausedFileIdRef.current = file.id;
    interval.callback();
    assert.equal(files, before, gate + ' preserves the exact current file array');
    assert.equal(filesRef.current, before, gate + ' preserves the authoritative ref');
    heatCapacityRefreshRestorePendingRef.current = false;
    heatCapacityRuntimeFailureFileIdRef.current = null;
    heatCapacityLessonDialogActiveRef.current = false;
    heatCapacityLessonPausedFileIdRef.current = null;
  }
  assert.equal(typeof cleanup, 'function');
  if (typeof cleanup === 'function') cleanup();
  assert.deepEqual(clearedIntervals, [clockId]);
  assert.equal(intervals.size, 0);
  const stoppedClock = useWorkbenchHeatRealtimeClock({ ...clockPorts, heatCapacityRuntimeFailureFileId: file.id });
  assert.equal(stoppedClock.effects.realtimeClock.run(), undefined);
  assert.equal(intervals.size, 0, 'a failed renderer must never acquire a clock');
} finally {
  Date.now = originalNow;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
console.log('workbenchHeatControllerResources tests passed');
