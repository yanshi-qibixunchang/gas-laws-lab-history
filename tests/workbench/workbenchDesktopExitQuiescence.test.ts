import assert from 'node:assert/strict';
import { createWorkbenchDesktopExitQuiescence, type WorkbenchDesktopExitQuiescencePorts } from '../../src/features/workbench/workbenchDesktopExitQuiescence.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultIdealFile, createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
const heat = { ...createDefaultHeatCapacityFile(), heatCapacityMode: 'demo' as const };
const standard = { ...createDefaultStandardFile(1), runState: 'running' as const };
const ideal = { ...createDefaultIdealFile(2), runState: 'running' as const };
const harness = () => {
  let now = 1000; const events: string[] = [];
  const ports: WorkbenchDesktopExitQuiescencePorts = {
    desktopExitQuiescedRef: { current: false }, desktopExitInputBlockedRef: { current: false },
    setDesktopExitInputBlocked: value => { events.push(`block:${value}`); },
    filesRef: { current: [heat, standard, ideal] as WorkbenchFileState[] }, activeFileIdRef: { current: heat.id },
    heatCapacityModeTransitionDemoClockRef: { current: { fileId: heat.id, elapsedMs: 300, initialDelayRemainingMs: 0 } }, desktopExitAutoDemoClockRef: { current: null },
    autoDemoPhaseRef: { current: 'running' }, heatCapacityAutoDemoStartedAtMsRef: { current: 200 }, pauseHeatCapacityModeTransitionRuntime: () => { events.push('pause-mode'); },
    desktopExitQuiescedAtMsRef: { current: null }, setDesktopExitQuiesced: value => { events.push(`quiesced:${value}`); },
    standardRuntimeRef: { current: { [standard.id]: {} } as WorkbenchDesktopExitQuiescencePorts['standardRuntimeRef']['current'] },
    idealRuntimeRef: { current: { [ideal.id]: {} } as WorkbenchDesktopExitQuiescencePorts['idealRuntimeRef']['current'] },
    cancelRuntimeFrame: id => { events.push(`cancel:${id}`); }, clearHeatCapacityAutoDemoTimers: () => { events.push('clear-demo'); },
    pauseHeatCapacityTransientUiTimers: () => { events.push('pause-ui'); }, pauseHeatCapacityPressureAlertTimers: () => { events.push('pause-pressure'); }, pauseGuideHeatCapacityReminderTimers: () => { events.push('pause-guide'); }, pauseHeatCapacityPumpAnimation: () => { events.push('pause-pump'); },
    desktopExitPausedPressureAlarmRef: { current: { fileId: heat.id, remainingMs: 80 } }, desktopExitPausedClosePumpValveReminderRef: { current: { fileId: heat.id, remainingMs: 90 } },
    heatCapacityRefreshRestorePendingRef: { current: false }, initialHeatCapacityRefreshSession: null,
    rebaseHeatCapacityFileForAutomaticSuspension: (file, start, end) => { assert.equal(start, 1000); assert.equal(end, 2000); events.push(`rebase:${file.id}`); return { ...file }; },
    setFiles: next => { assert.strictEqual(next, ports.filesRef.current, 'refs are committed before React state'); events.push('files'); },
    heatCapacityRuntimeFailureFileIdRef: { current: null }, heatCapacityPressureAlarmVisibleRef: { current: true },
    scheduleHeatCapacityPressureAlarmExpiry: (_id, remaining) => { events.push(`alarm:${remaining}`); }, scheduleHeatCapacityClosePumpValveReminder: (_id, remaining) => { events.push(`reminder:${remaining}`); },
    resumeHeatCapacityPumpAnimation: () => { events.push('resume-pump'); }, resumeHeatCapacityTransientUiTimers: () => { events.push('resume-ui'); },
    heatCapacityModeTransitionStateRef: { current: { phase: 'idle' } as WorkbenchDesktopExitQuiescencePorts['heatCapacityModeTransitionStateRef']['current'] },
    scheduleHeatCapacityAutoDemoTimeline: (_id, _timeline, elapsed, remaining) => { events.push(`demo:${elapsed}:${remaining}`); }, heatCapacityAutoDemoTimelineRef: { current: [] },
    resumeHeatCapacityModeTransitionRuntime: () => { events.push('resume-mode'); }, heatCapacitySceneReadyFileIdRef: { current: null }, recoverHeatCapacityRuntimeIfReadyRef: { current: id => { events.push(`recover:${id}`); } },
    scheduleStandardFrame: id => { events.push(`standard:${id}`); }, scheduleIdealFrame: id => { events.push(`ideal:${id}`); }, scheduleWorkspacePersistenceRef: { current: () => { events.push('save'); return true; } },
    performance: { now: () => 500 }, Date: { now: () => now },
  };
  return { ports, events, actions: createWorkbenchDesktopExitQuiescence(ports), advance: () => { now = 2000; } };
};
const active = harness(); const savedClock = active.ports.heatCapacityModeTransitionDemoClockRef.current;
active.actions.prepareDesktopExitQuiescence(false);
assert.deepEqual(active.events, ['block:false', 'pause-mode', 'quiesced:true', `cancel:${standard.id}`, `cancel:${ideal.id}`, 'clear-demo', 'pause-ui', 'pause-pressure', 'pause-pump']);
assert.strictEqual(active.ports.desktopExitAutoDemoClockRef.current, savedClock); assert.equal(active.ports.heatCapacityModeTransitionDemoClockRef.current, null); assert.equal(active.ports.desktopExitQuiescedAtMsRef.current, 1000);
active.events.length = 0; active.actions.prepareDesktopExitQuiescence(true); assert.deepEqual(active.events, ['block:true']);
active.events.length = 0; active.advance(); active.actions.resumeDesktopExitQuiescence();
assert.deepEqual(active.events, ['block:false', 'quiesced:false', `rebase:${heat.id}`, 'files', 'alarm:80', 'resume-pump', 'resume-ui', 'demo:300:0', 'resume-mode', `standard:${standard.id}`, `ideal:${ideal.id}`, 'save']);
assert.equal(active.ports.desktopExitPausedPressureAlarmRef.current, null); assert.equal(active.ports.desktopExitPausedClosePumpValveReminderRef.current, null); assert.equal(active.ports.desktopExitAutoDemoClockRef.current, null);
assert.strictEqual(active.ports.filesRef.current[1], standard); assert.strictEqual(active.ports.filesRef.current[2], ideal);
const count = active.events.length; active.actions.resumeDesktopExitQuiescence(); assert.equal(active.events.length, count);
const failed = harness(); failed.actions.prepareDesktopExitQuiescence(); failed.ports.heatCapacityRuntimeFailureFileIdRef.current = heat.id; failed.ports.heatCapacitySceneReadyFileIdRef.current = heat.id; failed.events.length = 0; failed.advance(); failed.actions.resumeDesktopExitQuiescence();
assert.ok(failed.events.includes(`recover:${heat.id}`)); assert.equal(failed.events.some(event => event.startsWith('alarm:') || event.startsWith('demo:') || event === 'resume-ui'), false); assert.notEqual(failed.ports.desktopExitPausedPressureAlarmRef.current, null);
const pending = harness(); pending.ports.initialHeatCapacityRefreshSession = { activeHeatCapacityFileId: heat.id } as NonNullable<WorkbenchDesktopExitQuiescencePorts['initialHeatCapacityRefreshSession']>; pending.ports.heatCapacityRefreshRestorePendingRef.current = true;
const pendingActions = createWorkbenchDesktopExitQuiescence(pending.ports); pendingActions.prepareDesktopExitQuiescence(); pending.events.length = 0; pending.advance(); pendingActions.resumeDesktopExitQuiescence();
assert.strictEqual(pending.ports.filesRef.current[0], heat, 'pending hydration owns the saved Heat timeline'); assert.equal(pending.events.some(event => event.startsWith('rebase:') || event.startsWith('alarm:') || event.startsWith('demo:')), false);
assert.notEqual(pending.ports.desktopExitPausedPressureAlarmRef.current, null);
console.log('Workbench desktop quiescence pause, restore and recovery tests passed.');
