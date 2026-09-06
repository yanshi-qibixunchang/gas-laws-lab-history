import assert from 'node:assert/strict';
import {
  createDefaultHeatCapacityPistonOscillationFile,
  startPistonOscillationFreeWorkbenchState,
  startPistonOscillationGuideWorkbenchState,
} from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import { createWorkbenchPistonModeActions, type WorkbenchPistonModeActionPorts } from '../../src/features/workbench/workbenchPistonModeActions.ts';
import { createWorkbenchPistonAcquisitionProcessingActions, type createWorkbenchPistonAcquisitionProcessingActionsPorts } from '../../src/features/workbench/workbenchPistonAcquisitionProcessingActions.ts';
import { createWorkbenchPistonFreeActions, type createWorkbenchPistonFreeActionsPorts } from '../../src/features/workbench/workbenchPistonFreeActions.ts';
import { startWorkbenchPistonDemoClock, type WorkbenchPistonDemoClockPorts } from '../../src/features/workbench/useWorkbenchPistonDemoRuntime.ts';
import { createPistonOscillationDemoPlaybackChannel } from '../../src/features/pistonOscillation/pistonOscillationDemoPlaybackChannel.ts';
import { PISTON_OSCILLATION_DEMO_DURATION_MS } from '../../src/features/pistonOscillation/pistonOscillationDemoTimeline.ts';
import { getPistonOscillationShellCopy } from '../../src/features/pistonOscillation/pistonOscillationCopy.ts';
import { workbenchPromptCopies } from '../../src/features/workbench/workbenchPromptCopies.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

const originalWindow = globalThis.window;
const originalPerformance = globalThis.performance;
let now = 100;
let nextTimerId = 1;
const intervals = new Map<number, () => void>();
const timeouts = new Map<number, () => void>();
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  setInterval: (callback: () => void, delay: number) => { assert.equal(delay, 50); const id = nextTimerId++; intervals.set(id, callback); return id; },
  clearInterval: (id: number) => intervals.delete(id),
  setTimeout: (callback: () => void) => { const id = nextTimerId++; timeouts.set(id, callback); return id; },
  clearTimeout: (id: number) => timeouts.delete(id),
}});
const noop = () => {};
try {
  {
    const file = createDefaultHeatCapacityPistonOscillationFile(1);
    const filesRef = { current: [file] as WorkbenchFileState[] };
    const calls: string[] = [];
    const quiesced = { current: false };
    const ports = {
      filesRef, desktopExitQuiescedRef: quiesced,
      scheduleHeatCapacitySemanticSceneCheckpointRef: { current: () => { assert.equal(filesRef.current[0], file); calls.push('scene'); } },
      scheduleWorkspacePersistenceRef: { current: () => { assert.equal(filesRef.current[0], file); calls.push('save'); return true; } },
      setFiles: (value: WorkbenchFileState[]) => { assert.equal(filesRef.current, value); calls.push('files'); },
    } as unknown as createWorkbenchPistonAcquisitionProcessingActionsPorts;
    const actions = createWorkbenchPistonAcquisitionProcessingActions(ports);
    const session = { ...file.pistonOscillationGuideSession, updatedAtMs: 123 };
    assert.equal(actions.commitPistonOscillationGuideAcquisitionSession(file, session, 123), true);
    assert.deepEqual(calls, ['scene', 'save', 'files'], 'acquisition capture schedules semantic checkpoints before publishing the replacement');
    assert.equal(filesRef.current[0].updatedAt, 123);
    assert.equal(actions.commitPistonOscillationGuideAcquisitionSession(file, session, 124), false, 'stale file identity cannot overwrite a newer commit');
    quiesced.current = true;
    assert.equal(actions.commitPistonOscillationGuideAcquisitionSession(filesRef.current[0] as typeof file, session, 125), false);
    assert.equal(calls.length, 3, 'exit quiescence rejects all further commit side effects');
  }
  {
    const initial = startPistonOscillationGuideWorkbenchState(createDefaultHeatCapacityPistonOscillationFile(2), 10);
    const file = { ...initial, pistonOscillationGuideSession: { ...initial.pistonOscillationGuideSession, step: 'waitingTrigger' as const } };
    const filesRef = { current: [file] as WorkbenchFileState[] };
    const pressureRef = { current: null as 'underpressure' | 'overpressure' | null };
    let lessonCount = 0;
    const ports = {
      filesRef, activeFileIdRef: { current: file.id },
      pistonOscillationCopy: getPistonOscillationShellCopy('zh-CN'),
      setPistonOscillationGuideStrongReminderActive: noop, setPistonOscillationGuideStrongReminderClockContext: noop,
      setPistonOscillationGuidePulseElapsedMs: noop, showPistonOscillationGuideFeedback: noop,
      setPistonOscillationGuidePressureIssue: (issue: typeof pressureRef.current) => { pressureRef.current = issue; },
      pistonOscillationGuidePressureIssueRef: pressureRef,
      pistonOscillationGuidePressureMissCountRef: { current: { underpressure: 0, overpressure: 0 } },
      pistonOscillationGuidePressureRangeLessonTimerRef: { current: null },
      pistonOscillationGuideStrongReminderTimerRef: { current: null },
      openPistonOscillationGuideOneTimeLesson: () => { lessonCount += 1; },
    } as unknown as createWorkbenchPistonAcquisitionProcessingActionsPorts;
    const actions = createWorkbenchPistonAcquisitionProcessingActions(ports);
    assert.equal(actions.handlePistonOscillationGuideAcquisitionEvent({ type: 'pressureAttemptRejected', reason: 'underpressure', peakPressureKpa: 110 }), true);
    const callback = [...timeouts.values()].at(-1)!;
    filesRef.current = [{ ...file, pistonOscillationGuideSession: { ...file.pistonOscillationGuideSession, startedAtMs: 99 } }];
    callback();
    assert.equal(lessonCount, 0, 'a deferred pressure lesson must not affect a restarted session');
    filesRef.current = [file];
    callback();
    assert.equal(lessonCount, 1, 'the matching live session still receives the deferred lesson');
    timeouts.clear();
  }
  {
    const file = createDefaultHeatCapacityPistonOscillationFile(3);
    const filesRef = { current: [file] as WorkbenchFileState[] };
    const calls: string[] = [];
    const channel = createPistonOscillationDemoPlaybackChannel();
    let playback = channel.getSnapshot();
    const ports: WorkbenchPistonModeActionPorts = {
      activeFile: file, filesRef, desktopExitQuiescedRef: { current: false },
      setFiles: (value) => { assert.equal(value, filesRef.current); calls.push('files'); },
      scheduleWorkspacePersistenceRef: { current: () => { assert.notEqual(filesRef.current[0], file); calls.push('save'); return true; } },
      flushWorkspacePersistenceRef: { current: async () => { calls.push('flush'); return true; } },
      pistonOscillationDemoPlaybackChannel: channel, pistonOscillationDemoPlayback: playback,
      setPistonOscillationDemoPlayback: value => { playback = typeof value === 'function' ? value(playback) : value; },
      requestPromptConfirmation: () => { throw Error('idle mode does not require a switch confirmation'); },
      workbenchPromptCopy: workbenchPromptCopies['zh-CN'], pistonOscillationCopy: getPistonOscillationShellCopy('zh-CN'),
      pistonOscillationCalculationWindowOpen: false, clearPistonOscillationGuideCompletionToast: noop,
      setPistonOscillationPowerOnByFileId: noop, setLeftCollapsed: noop, setParametersCollapsed: noop,
      pistonOscillationGuideResetFeedbackTimerRef: { current: null }, setPistonOscillationGuideResetFeedback: noop,
      setPistonOscillationFreeSetupRequestedFileId: noop, activatePistonOscillationFreeMode: noop, pausePistonOscillationFreeMode: noop,
    };
    createWorkbenchPistonModeActions(ports).commands.startDemo();
    assert.deepEqual(calls, ['files', 'save', 'flush'], 'mode activation publishes the file before saving; it must not reuse acquisition CAS ordering');
    assert.equal(playback.phase, 'running');
    assert.equal(channel.getSnapshot().fileId, file.id);
  }
  {
    const file = createDefaultHeatCapacityPistonOscillationFile(4);
    const channel = createPistonOscillationDemoPlaybackChannel();
    const snapshot = { fileId: file.id, phase: 'running' as const, elapsedMs: 250 };
    channel.publish(snapshot);
    let files: WorkbenchFileState[] = [file];
    let stateWrites = 0;
    let fileWrites = 0;
    let sidebarWrites = 0;
    let flushes = 0;
    const ports: WorkbenchPistonDemoClockPorts = {
      pistonOscillationDemoPlayback: snapshot, pistonOscillationGuideLessonDialog: null,
      pistonOscillationDemoPlaybackChannel: channel,
      setPistonOscillationDemoPlayback: () => { stateWrites += 1; },
      setWorkbenchFiles: updater => { fileWrites += 1; files = updater(files); },
      activeFileIdRef: { current: 'another-file' }, setLeftCollapsed: () => { sidebarWrites += 1; },
      flushWorkspacePersistenceRef: { current: async () => { flushes += 1; return true; } },
    };
    const cleanup = startWorkbenchPistonDemoClock(ports)!;
    now += 50;
    [...intervals.values()][0]();
    assert.equal(channel.getSnapshot().elapsedMs, 300, 'resume uses the published elapsed time');
    assert.equal(stateWrites, 0); assert.equal(fileWrites, 0, 'normal 50 ms ticks do not publish React file state');
    now += PISTON_OSCILLATION_DEMO_DURATION_MS;
    [...intervals.values()][0]();
    assert.equal(stateWrites, 1); assert.equal(fileWrites, 1);
    assert.equal((files[0] as typeof file).pistonOscillationDemoSession.status, 'completed');
    assert.equal(sidebarWrites, 0, 'completion of a former active file does not change the current sidebar');
    [...timeouts.values()].at(-1)!();
    assert.equal(flushes, 1);
    cleanup(); assert.equal(intervals.size, 0, 'effect teardown releases its exact interval');
    assert.equal(startWorkbenchPistonDemoClock({ ...ports, pistonOscillationGuideLessonDialog: { kind: 'intro', fileId: file.id, pageIndex: 0, closing: false } }), undefined);
    assert.equal(intervals.size, 0, 'a visible lesson prevents the Demo clock from starting');
    timeouts.clear();
  }
  {
    const file = startPistonOscillationFreeWorkbenchState(createDefaultHeatCapacityPistonOscillationFile(5), 20);
    const order: string[] = [];
    let updated = file;
    const ports = {
      activeFileIdRef: { current: file.id },
      pistonOscillationAcquisitionPanelRef: { current: { pauseAndCaptureFreeRun: () => { order.push('capture'); return null; } } },
      updateFileById: (_id: string, updater: (file: WorkbenchFileState) => WorkbenchFileState) => { order.push('update'); updated = updater(updated) as typeof file; },
      setPistonOscillationPowerOnByFileId: () => { order.push('power'); },
      setLeftCollapsed: () => { order.push('sidebar'); },
    } as unknown as createWorkbenchPistonFreeActionsPorts;
    createWorkbenchPistonFreeActions(ports).pausePistonOscillationFreeMode();
    assert.equal(updated.pistonOscillationFreeSession.status, 'paused');
    assert.deepEqual(order, ['capture', 'update', 'power', 'sidebar'], 'free pause captures the visible acquisition before changing its runtime and UI');
  }
} finally {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: originalPerformance });
}
console.log('Workbench piston controller timing, ownership and deferred-event tests passed.');
