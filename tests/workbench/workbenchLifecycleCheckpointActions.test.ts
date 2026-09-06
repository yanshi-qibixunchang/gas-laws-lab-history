import assert from 'node:assert/strict';
import { createWorkbenchSemanticCheckpointActions, type WorkbenchSemanticCheckpointPorts } from '../../src/features/workbench/workbenchSemanticCheckpointActions.ts';
import { createWorkbenchLifecycleCheckpointActions, type WorkbenchLifecycleCheckpointPorts } from '../../src/features/workbench/workbenchLifecycleCheckpointActions.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import type { HeatCapacitySceneCheckpointProvider } from '../../src/features/heatCapacity/HeatCapacityInstrumentScene.tsx';
const heat = createDefaultHeatCapacityFile();
let captured = 0; let timerId = 0;
const timers = new Map<number, { callback: () => unknown; delay: number }>();
const provider: HeatCapacitySceneCheckpointProvider = () => { captured += 1; return {} as NonNullable<ReturnType<HeatCapacitySceneCheckpointProvider>>; };
const semanticPorts: WorkbenchSemanticCheckpointPorts = {
  window: { setTimeout: (callback: TimerHandler, delay?: number) => { const id = ++timerId; timers.set(id, { callback: callback as () => unknown, delay: delay ?? 0 }); return id; }, clearTimeout: id => { timers.delete(id!); } },
  heatCapacitySemanticCheckpointDebounceTimerRef: { current: null }, heatCapacitySemanticCheckpointMaxWaitTimerRef: { current: null },
  desktopExitQuiescedRef: { current: false }, heatCapacityRefreshRestorePendingRef: { current: false }, heatCapacityModeTransitionStateRef: { current: { phase: 'idle' } }, heatCapacityRuntimeFailureFileIdRef: { current: null },
  filesRef: { current: [heat] }, activeFileIdRef: { current: heat.id }, heatCapacitySceneCheckpointProviderRef: { current: { fileId: heat.id, provider } },
};
const semantic = createWorkbenchSemanticCheckpointActions(semanticPorts);
semantic.scheduleHeatCapacitySemanticSceneCheckpoint(); const firstDebounce = semanticPorts.heatCapacitySemanticCheckpointDebounceTimerRef.current!; const firstMax = semanticPorts.heatCapacitySemanticCheckpointMaxWaitTimerRef.current!;
assert.equal(timers.get(firstDebounce)!.delay, 120); assert.equal(timers.get(firstMax)!.delay, 600);
semantic.scheduleHeatCapacitySemanticSceneCheckpoint(); assert.equal(timers.has(firstDebounce), false); assert.equal(semanticPorts.heatCapacitySemanticCheckpointMaxWaitTimerRef.current, firstMax);
timers.get(firstMax)!.callback(); assert.equal(captured, 1); assert.equal(timers.size, 0); assert.equal(semanticPorts.heatCapacitySemanticCheckpointDebounceTimerRef.current, null);
for (const [set, clear] of [
  [() => { semanticPorts.desktopExitQuiescedRef.current = true; }, () => { semanticPorts.desktopExitQuiescedRef.current = false; }],
  [() => { semanticPorts.heatCapacityRefreshRestorePendingRef.current = true; }, () => { semanticPorts.heatCapacityRefreshRestorePendingRef.current = false; }],
  [() => { semanticPorts.heatCapacityModeTransitionStateRef.current.phase = 'restoring'; }, () => { semanticPorts.heatCapacityModeTransitionStateRef.current.phase = 'idle'; }],
  [() => { semanticPorts.heatCapacityRuntimeFailureFileIdRef.current = heat.id; }, () => { semanticPorts.heatCapacityRuntimeFailureFileIdRef.current = null; }],
] as const) { set(); assert.equal(semantic.captureActiveHeatCapacitySemanticSceneCheckpoint(), false); clear(); }
assert.equal(captured, 1); semanticPorts.heatCapacitySceneCheckpointProviderRef.current = { fileId: 'other', provider }; assert.equal(semantic.captureActiveHeatCapacitySemanticSceneCheckpoint(), false);
semanticPorts.heatCapacitySceneCheckpointProviderRef.current = { fileId: heat.id, provider };

const events: string[] = []; const pending: Array<{ resolve: (value: boolean) => void; reject: (error: Error) => void }> = [];
const lifecyclePorts: WorkbenchLifecycleCheckpointPorts = {
  clearHeatCapacitySemanticCheckpointTimers: () => { events.push('clear'); }, filesRef: semanticPorts.filesRef, activeFileIdRef: semanticPorts.activeFileIdRef,
  heatCapacitySceneCheckpointProviderRef: { current: { fileId: heat.id, provider: () => { assert.equal(lifecyclePorts.heatCapacityLifecycleFlushInProgressRef.current, true); events.push('scene'); return provider(); } } },
  heatCapacityLifecycleFlushInProgressRef: { current: false }, heatCapacityLifecycleFlushPromiseRef: { current: null },
  heatCapacityRefreshPersistRef: { current: () => { assert.equal(lifecyclePorts.heatCapacityLifecycleFlushInProgressRef.current, false); events.push('schedule'); } },
  flushWorkspacePersistenceRef: { current: () => { events.push('flush'); return new Promise((resolve, reject) => pending.push({ resolve, reject })); } },
};
const lifecycle = createWorkbenchLifecycleCheckpointActions(lifecyclePorts);
const first = lifecycle.persistWorkspaceLifecycleCheckpoint(); const joined = lifecycle.persistWorkspaceLifecycleCheckpoint(); const fresh = lifecycle.persistWorkspaceLifecycleCheckpoint(true);
assert.deepEqual(events, ['clear', 'scene', 'schedule', 'flush']); assert.equal(pending.length, 1);
pending[0]!.resolve(true); assert.equal(await first, true); assert.equal(await joined, true);
await Promise.resolve(); assert.equal(pending.length, 2, 'fresh exit waits for the earlier operation then captures again');
pending[1]!.resolve(true); assert.equal(await fresh, true); assert.equal(lifecyclePorts.heatCapacityLifecycleFlushPromiseRef.current, null);
const failed = lifecycle.persistWorkspaceLifecycleCheckpoint(); const freshAfterFailure = lifecycle.persistWorkspaceLifecycleCheckpoint(true);
pending[2]!.reject(Error('disk failure')); await assert.rejects(failed, /disk failure/); await Promise.resolve(); assert.equal(pending.length, 4);
pending[3]!.resolve(true); assert.equal(await freshAfterFailure, true, 'an earlier failed flush cannot suppress the post-quiescence checkpoint');
lifecyclePorts.heatCapacitySceneCheckpointProviderRef.current = null; const noScene = lifecycle.persistWorkspaceLifecycleCheckpoint(); pending[4]!.resolve(true); assert.equal(await noScene, false);
const standard = createDefaultStandardFile(1); lifecyclePorts.filesRef.current = [standard]; lifecyclePorts.activeFileIdRef.current = standard.id;
const nonHeat = lifecycle.persistWorkspaceLifecycleCheckpoint(); pending[5]!.resolve(true); assert.equal(await nonHeat, true);
console.log('Workbench semantic timers and lifecycle single-flight tests passed.');
