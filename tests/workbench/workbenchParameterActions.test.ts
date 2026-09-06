import assert from 'node:assert/strict';
import { createWorkbenchParameterActions } from '../../src/features/workbench/workbenchParameterActions.ts';
import { createWorkbenchIdealExperimentActions } from '../../src/features/workbench/workbenchIdealExperimentActions.ts';
import { createWorkbenchIdealScanInput } from '../../src/features/workbench/workbenchIdealScanInput.ts';
import { createDefaultStandardFile, createDefaultIdealFile } from '../../src/features/workbench/workbenchFileState.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import type { StandardEngineRuntime } from '../../src/features/workbench/workbenchSimulationRuntimeTypes.ts';

const harness = (initial: WorkbenchFileState) => {
 let file = initial; let dirty = false; let locked = false; let controlledLocked = false; let errors: string[] = [];
 let drafts: Record<string, string> = { N: '140', r: '0.1' }; const events: string[] = [];
 const standardRuntimeRef = { current: {} as Record<string, StandardEngineRuntime> }; const idealRuntimeRef = { current: {} as Record<string, StandardEngineRuntime> };
 const actions = createWorkbenchParameterActions({
 getActiveFile: () => file, getParameterControlsLocked: () => locked, getParametersDirty: () => dirty,
 workbenchCopy: workbenchCopies['en'], getLockedIdealControlledVariableKeys: () => controlledLocked ? ['L'] : [],
 showWorkbenchValidationErrors: validation => { errors = validation.errors; }, captureUndoSnapshot: () => { events.push('history'); },
 updateActiveFile: update => { assert.ok(standardRuntimeRef.current[file.id] || idealRuntimeRef.current[file.id]); events.push('commit'); file = update(file); },
 standardRuntimeRef, idealRuntimeRef, cancelRuntimeFrame: () => { events.push('cancel'); },
 getStandardRuntime: current => standardRuntimeRef.current[current.id] ?? null, getIdealRuntime: current => idealRuntimeRef.current[current.id] ?? null,
 snapshotParticles: engine => engine.particles.map(p => ({ ...p })),
 setParameterInputDrafts: next => { drafts = typeof next === 'function' ? next(drafts) : next; }, setParameterErrors: next => { errors = typeof next === 'function' ? next(errors) : next; }, pushLog: () => {},
 });
 return { actions, events, standardRuntimeRef, idealRuntimeRef, file: () => file, errors: () => errors, drafts: () => drafts,
 setRunning: () => { file = { ...file, runState: 'running' }; }, lock: () => { locked = true; }, lockControlled: () => { controlledLocked = true; }, setDirty: () => { dirty = true; } };
};
const base = createDefaultStandardFile(1); const standard = harness(base);
const applied = standard.actions.applyActiveFileParams({ ...base.params, N: 120 }, { silent: true });
assert.ok(applied); assert.deepEqual(standard.events, ['history', 'cancel', 'commit']);
assert.strictEqual(standard.standardRuntimeRef.current[base.id], applied); assert.equal(standard.file().params.N, 120); assert.equal(applied.engine.createSnapshot().params.N, 120);
standard.events.length = 0; const retained = standard.actions.applyActiveFileParams({ ...standard.file().params }, { silent: true });
assert.strictEqual(retained, applied); assert.deepEqual(standard.events, ['commit'], 'matching applied params must retain runtime and skip history');
standard.events.length = 0; standard.setRunning(); assert.equal(standard.actions.applyActiveFileParams({ ...base.params, N: 130 }), null); assert.deepEqual(standard.events, []);
const invalid = harness(base); assert.equal(invalid.actions.applyActiveFileParams({ ...base.params, N: -1 }), null); assert.ok(invalid.errors().length); assert.deepEqual(invalid.events, []);
const idealBase = createDefaultIdealFile(2); const ideal = harness(idealBase); const points = idealBase.pointsByRelation;
assert.ok(ideal.actions.applyActiveFileParams({ ...idealBase.params, N: 120 }, { silent: true }));
assert.deepEqual(ideal.events, ['history', 'cancel', 'commit']); const idealFile = ideal.file(); assert.equal(idealFile.kind, 'ideal');
if (idealFile.kind !== 'ideal') throw Error('expected ideal'); assert.strictEqual(idealFile.pointsByRelation, points); assert.equal(idealFile.needsReset, false);
ideal.events.length = 0; ideal.lockControlled(); assert.equal(ideal.actions.applyActiveFileParams({ ...idealFile.params, L: idealFile.params.L + 1 }), null); assert.deepEqual(ideal.events, []);
const parser = createWorkbenchIdealScanInput('en').parseIdealScanInput;
assert.deepEqual(parser('120', 'pn', 100, 500), { valid: true, value: 120 });
for (const raw of ['', '120.0', '1e2', '0', '-120', '501']) assert.equal(parser(raw, 'pn', 100, 500).valid, false, raw);
assert.deepEqual(parser(' 0.61 ', 'pt', 0.6, 2.5), { valid: true, value: 0.61 });
assert.equal(parser('0.611', 'pt', 0.6, 2.5).valid, false); assert.equal(parser('0.59', 'pt', 0.6, 2.5).valid, false);
let experiment = idealBase; let scanDraft = '0.61'; let scanError: string | null = null; let pendingRemove: string | null = null; let pendingClear: string | null = null;
const edits: string[] = []; const deferred: (() => void)[] = []; let focused = 0; let blurred = 0; let logs = 0;
const idealActions = createWorkbenchIdealExperimentActions({
 getActiveFile: () => experiment, getParameterControlsLocked: () => false, getScanInputDraft: () => scanDraft,
 getPendingRemovePointId: () => pendingRemove, getPendingClearRelationKey: () => pendingClear,
 settingsLanguagePreference: 'en', captureUndoSnapshot: label => { edits.push(label); },
 updateActiveFile: update => { const next = update(experiment); if (next.kind !== 'ideal') throw Error('kind changed'); experiment = next; },
 applyActiveFileParams: () => {}, showWorkbenchValidationErrors: () => { throw Error('unexpected validation'); },
 scanInputRef: { current: { focus: () => { focused += 1; }, select: () => {}, blur: () => { blurred += 1; } } as HTMLInputElement }, lastScanInputErrorRef: { current: null }, deferInputFocus: callback => { deferred.push(callback); },
 setPendingRemovePointId: next => { pendingRemove = typeof next === 'function' ? next(pendingRemove) : next; },
 setPendingClearRelationKey: next => { pendingClear = typeof next === 'function' ? next(pendingClear) : next; }, setSamplingPresetMenuOpen: () => {},
 setScanInputError: next => { scanError = typeof next === 'function' ? next(scanError) : next; }, setParameterErrors: () => {}, setScanInputToast: () => {},
 setScanInputDraft: next => { scanDraft = typeof next === 'function' ? next(scanDraft) : next; }, setScanInputFocused: () => {}, pushLog: () => { logs += 1; },
});
idealActions.changeIdealRelation('pt'); assert.equal(edits.length, 0);
idealActions.commitIdealScanInput(); assert.equal(experiment.params.targetTemperature, 0.61); assert.equal(experiment.needsReset, true); assert.strictEqual(experiment.pointsByRelation, points); assert.equal(blurred, 1);
const beforeError = edits.length; scanDraft = '0.611'; idealActions.commitIdealScanInput(); assert.ok(scanError); assert.equal(edits.length, beforeError); assert.equal(focused, 0); assert.equal(deferred.length, 1);
deferred[0]!(); assert.equal(focused, 1); const beforeDuplicate = logs; idealActions.commitIdealScanInput(); assert.equal(logs, beforeDuplicate, 'repeated scan error log is deduplicated');
idealActions.changeIdealRelation('pn'); assert.equal(experiment.relation, 'pn'); assert.strictEqual(experiment.pointsByRelation, points);
console.log('Workbench parameter application and ideal input action tests passed.');

const point = { id: 'point-a', relation: 'pn' as const, targetTemperature: 1, meanTemperature: 1, meanPressure: 2, idealPressure: 2, relativeGap: 0, timestamp: 1 };
const unrelatedPoints = experiment.pointsByRelation.pt;
experiment = { ...experiment, pointsByRelation: { ...experiment.pointsByRelation, pn: [point] } };
const beforeRemoval = edits.length; idealActions.requestRemoveIdealPoint(point); assert.equal(edits.length, beforeRemoval); assert.equal(pendingRemove, point.id);
idealActions.cancelRemoveIdealPoint(); assert.equal(pendingRemove, null); assert.equal(experiment.pointsByRelation.pn.length, 1);
idealActions.requestRemoveIdealPoint(point); idealActions.requestRemoveIdealPoint(point); assert.equal(edits.length, beforeRemoval + 1); assert.equal(experiment.pointsByRelation.pn.length, 0); assert.strictEqual(experiment.pointsByRelation.pt, unrelatedPoints);
experiment = { ...experiment, pointsByRelation: { ...experiment.pointsByRelation, pn: [point] } };
const beforeClear = edits.length; idealActions.requestClearIdealRelation(); assert.equal(edits.length, beforeClear); idealActions.cancelClearIdealRelation(); assert.equal(pendingClear, null);
idealActions.requestClearIdealRelation(); idealActions.requestClearIdealRelation(); assert.equal(edits.length, beforeClear + 1); assert.equal(experiment.pointsByRelation.pn.length, 0); assert.strictEqual(experiment.pointsByRelation.pt, unrelatedPoints);
