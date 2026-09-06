import assert from 'node:assert/strict';
import { createWorkbenchHardSphereRuntimeRegistry } from '../../src/features/workbench/workbenchHardSphereRuntimeRegistry.ts';
import { createWorkbenchHardSphereFrameLoop } from '../../src/features/workbench/workbenchHardSphereFrameLoop.ts';
import { createWorkbenchExperimentRunActions } from '../../src/features/workbench/workbenchExperimentRunActions.ts';
import { createDefaultStandardFile, createDefaultIdealFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import type { StandardEngineRuntime } from '../../src/features/workbench/workbenchSimulationRuntimeTypes.ts';

const harness = (initial: WorkbenchFileState[]) => {
 const filesRef = { current: initial }; const standardRuntimeRef = { current: {} as Record<string, StandardEngineRuntime> }; const idealRuntimeRef = { current: {} as Record<string, StandardEngineRuntime> };
 const desktopExitQuiescedRef = { current: false }; const scheduled = new Map<number, () => void>(); let sequence = 0; let activeId = initial[0]!.id;
 const events: string[] = []; let prepare = true; let dirty = false;
 const clock = { setTimeout: (callback: () => void, delay: number) => { assert.equal(delay, 16); scheduled.set(++sequence, callback); return sequence; }, clearTimeout: (id: number) => { events.push('cancel'); scheduled.delete(id); } };
 const updateFileById = (id: string, update: (file: WorkbenchFileState) => WorkbenchFileState) => { events.push('semantic'); filesRef.current = filesRef.current.map(file => file.id === id ? update(file) : file); };
 const registry = createWorkbenchHardSphereRuntimeRegistry({ window: clock as unknown as Window, filesRef, standardRuntimeRef, idealRuntimeRef, updateFileById });
 const frames = createWorkbenchHardSphereFrameLoop({ window: clock as unknown as Window, filesRef, standardRuntimeRef, idealRuntimeRef, desktopExitQuiescedRef, updateFileById,
 updateRuntimeFileById: (id, update) => { events.push('runtime'); filesRef.current = filesRef.current.map(file => file.id === id ? update(file) : file); }, cancelRuntimeFrame: registry.cancelRuntimeFrame, pushLog: () => {} });
 const activeFile = () => filesRef.current.find(file => file.id === activeId)!;
 const controls = createWorkbenchExperimentRunActions({ getActiveFile: activeFile, getParametersDirty: () => dirty, standardRuntimeRef, idealRuntimeRef,
 createStandardRuntime: registry.createStandardRuntime, createIdealRuntime: registry.createIdealRuntime, getStandardRuntime: registry.getStandardRuntime, getIdealRuntime: registry.getIdealRuntime,
 cancelRuntimeFrame: registry.cancelRuntimeFrame, pauseRunningFilesExcept: frames.pauseRunningFilesExcept, scheduleStandardFrame: frames.scheduleStandardFrame, scheduleIdealFrame: frames.scheduleIdealFrame,
 prepareActiveFileForRun: () => { events.push('prepare'); return prepare; }, applyActiveFileParams: () => { events.push('apply'); return null; },
 updateActiveFile: update => updateFileById(activeId, update), flushWorkspaceAfterRunStateCommit: () => { events.push('flush'); },
 runHeatCapacityAutoDemo: () => { events.push('heat-run'); }, pauseHeatCapacityAutoDemo: () => { events.push('heat-pause'); }, terminateHeatCapacityAutoDemo: () => { events.push('heat-stop'); },
 setParameterErrors: () => {}, setSamplingPresetMenuOpen: () => {}, pushLog: () => {},
 });
 const tick = () => { const callbacks = [...scheduled.values()]; scheduled.clear(); callbacks.forEach(callback => callback()); };
 return { filesRef, standardRuntimeRef, idealRuntimeRef, desktopExitQuiescedRef, events, registry, frames, controls, scheduled, tick, activeFile,
 setActive: (id: string) => { activeId = id; }, blockPrepare: () => { prepare = false; }, setDirty: () => { dirty = true; } };
};
const standardBase = createDefaultStandardFile(1); const fastParams = { ...standardBase.appliedParams, N: 100, dt: 0.01, equilibriumTime: 0.1, statsDuration: 0.2 };
const standard = { ...standardBase, params: fastParams, appliedParams: fastParams };
const runner = harness([standard]); runner.registry.initializeExistingRuntimes(); assert.equal(runner.events.length, 1); const initialRuntime = runner.standardRuntimeRef.current[standard.id]!;
assert.strictEqual(runner.registry.getStandardRuntime(runner.activeFile()), initialRuntime);
runner.registry.initializeExistingRuntimes(); assert.equal(runner.events.length, 1, 'initializing existing runtime is idempotent');
runner.events.length = 0; runner.controls.runActiveFile(); assert.deepEqual(runner.events, ['prepare', 'semantic']); assert.equal(runner.scheduled.size, 1);
runner.frames.scheduleStandardFrame(standard.id); assert.equal(runner.scheduled.size, 1, 'only one timer per existing runtime');
const chartBefore = runner.activeFile().kind === 'standard' ? runner.activeFile() : null;
runner.events.length = 0; runner.tick(); assert.equal(initialRuntime.frameCount, 1); assert.ok(Math.abs(initialRuntime.engine.time - 0.05) < 1e-9); assert.deepEqual(runner.events, ['runtime']);
assert.strictEqual((runner.activeFile() as typeof standard).chartData, (chartBefore as typeof standard).chartData, 'non-refresh tick retains chart reference');
for (let i = 0; i < 20 && runner.activeFile().runState === 'running'; i += 1) runner.tick();
assert.equal(runner.activeFile().runState, 'finished'); assert.equal(runner.scheduled.size, 0); assert.equal(runner.events.filter(event => event === 'semantic').length, 1, 'completed result is committed once');
assert.ok((runner.activeFile() as typeof standard).finalChartData); const finishedSnapshot = (runner.activeFile() as typeof standard).hardSphereEngineSnapshot!;
const restored = runner.registry.createStandardRuntime(runner.activeFile())!; assert.deepEqual(restored.engine.createSnapshot(), finishedSnapshot, 'matching params restore the exact saved engine state');
runner.controls.stopActiveFile(); assert.equal(runner.activeFile().runState, 'idle'); assert.equal((runner.activeFile() as typeof standard).finalChartData, null); assert.deepEqual(runner.events.slice(-2), ['semantic', 'flush']);
runner.controls.runActiveFile(); runner.events.length = 0; runner.controls.pauseActiveFile(); assert.deepEqual(runner.events, ['cancel', 'semantic', 'flush']); assert.equal(runner.activeFile().runState, 'paused');
runner.controls.runActiveFile(); const beforeExit = runner.standardRuntimeRef.current[standard.id]!.engine.time; runner.desktopExitQuiescedRef.current = true; runner.tick(); assert.equal(runner.standardRuntimeRef.current[standard.id]!.engine.time, beforeExit); assert.equal(runner.scheduled.size, 0);
const idealBase = createDefaultIdealFile(2); const idealParams = { ...idealBase.activeParams, N: 100, dt: 0.01, equilibriumTime: 0.1, statsDuration: 0.3 };
const ideal = harness([{ ...idealBase, params: idealParams, appliedParams: idealParams, activeParams: idealParams }]); ideal.registry.initializeExistingRuntimes(); ideal.controls.runActiveFile(); ideal.events.length = 0;
for (let i = 0; i < 30 && ideal.activeFile().runState === 'running'; i += 1) ideal.tick();
const completedIdeal = ideal.activeFile(); if (completedIdeal.kind !== 'ideal') throw Error('expected ideal');
assert.equal(completedIdeal.runState, 'finished'); assert.equal(completedIdeal.pointsByRelation.pt.length, 1); assert.equal(ideal.events.filter(e => e === 'semantic').length, 1); assert.equal(ideal.scheduled.size, 0);
const points = completedIdeal.pointsByRelation; ideal.controls.stopActiveFile(); const stoppedIdeal = ideal.activeFile(); if (stoppedIdeal.kind !== 'ideal') throw Error('expected ideal'); assert.strictEqual(stoppedIdeal.pointsByRelation, points); assert.equal(stoppedIdeal.needsReset, false);
const oldStandardRegistry = runner.standardRuntimeRef.current; runner.registry.reconcileRuntimesAfterRestore([standard, idealBase]); assert.notStrictEqual(runner.standardRuntimeRef.current, oldStandardRegistry); assert.deepEqual(Object.keys(runner.standardRuntimeRef.current), [standard.id]); assert.deepEqual(Object.keys(runner.idealRuntimeRef.current), [idealBase.id]);
const unaffected = runner.idealRuntimeRef.current[idealBase.id]; runner.registry.reconcileRuntimeAfterFileRestore(standard); assert.strictEqual(runner.idealRuntimeRef.current[idealBase.id], unaffected);
runner.desktopExitQuiescedRef.current = false; runner.frames.scheduleStandardFrame(standard.id); runner.frames.scheduleIdealFrame(idealBase.id); assert.equal(runner.scheduled.size, 2); runner.registry.disposeHardSphereRuntimeTimers(); assert.equal(runner.scheduled.size, 0);
const heat = harness([createDefaultHeatCapacityFile(3)]); heat.setDirty(); heat.controls.runActiveFile(); assert.deepEqual(heat.events, ['apply', 'heat-run']); heat.controls.pauseActiveFile(); heat.controls.stopActiveFile(); assert.deepEqual(heat.events.slice(-3), ['heat-pause', 'heat-stop', 'flush']);
const piston = harness([createDefaultHeatCapacityPistonOscillationFile(4)]); piston.controls.runActiveFile(); piston.controls.pauseActiveFile(); piston.controls.stopActiveFile(); assert.deepEqual(piston.events, []);
const blocked = harness([standard]); blocked.blockPrepare(); blocked.controls.runActiveFile(); assert.deepEqual(blocked.events, ['prepare']); assert.equal(blocked.scheduled.size, 0);
console.log('Workbench real engine, frame clock and run control tests passed.');
