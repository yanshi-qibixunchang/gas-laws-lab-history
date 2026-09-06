import assert from 'node:assert/strict';
import { createDefaultIdealFile, createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import { synchronizeWorkbenchParameterSidebarAvailability } from '../../src/features/workbench/useWorkbenchParameterSidebarAvailability.ts';
import { createWorkbenchParameterSidebarActions } from '../../src/features/workbench/workbenchParameterSidebarActions.ts';
import { selectWorkbenchParameterInteractionPresentation } from '../../src/features/workbench/workbenchParameterInteractionPresentation.ts';
import { createWorkbenchParameterValidationActions } from '../../src/features/workbench/workbenchParameterValidationActions.ts';
import { useWorkbenchExperimentParameterActions } from '../../src/features/workbench/useWorkbenchExperimentParameterActions.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import type { StandardEngineRuntime } from '../../src/features/workbench/workbenchSimulationRuntimeTypes.ts';
import type { WorkbenchLogWriter } from '../../src/features/workbench/workbenchActionPorts.ts';

const changes: string[] = [];
const ports = { activeFile: createDefaultStandardFile(1) as WorkbenchFileState, activePistonOscillationParameterSidebarAvailable: false,
  setParametersCollapsed: () => { changes.push('collapse'); }, setIdealAdvancedSettingsOpen: () => { changes.push('ideal-open'); },
  setIdealAdvancedSettingsBodyVisible: () => { changes.push('ideal-body'); }, closeHeatCapacityParameterWindows: () => { changes.push('heat-close'); },
};
synchronizeWorkbenchParameterSidebarAvailability(ports); assert.deepEqual(changes, []);
synchronizeWorkbenchParameterSidebarAvailability({ ...ports, activeFile: createDefaultHeatCapacityPistonOscillationFile() });
assert.deepEqual(changes.splice(0), ['collapse', 'ideal-open', 'ideal-body']);
synchronizeWorkbenchParameterSidebarAvailability({ ...ports, activeFile: createDefaultHeatCapacityPistonOscillationFile(), activePistonOscillationParameterSidebarAvailable: true });
assert.deepEqual(changes.splice(0), ['ideal-open', 'ideal-body']);
const heat = createDefaultHeatCapacityFile();
synchronizeWorkbenchParameterSidebarAvailability({ ...ports, activeFile: { ...heat, heatCapacityMode: 'guide' } }); assert.deepEqual(changes.splice(0), ['collapse', 'heat-close']);
synchronizeWorkbenchParameterSidebarAvailability({ ...ports, activeFile: { ...heat, heatCapacityMode: 'free' } }); assert.deepEqual(changes, []);
const messages: string[] = []; let toast: string | null = null; let collapsed = true;
const log: WorkbenchLogWriter = message => { messages.push(typeof message === 'function' ? message('en') : message); };
const railPorts = { activeFile: createDefaultHeatCapacityPistonOscillationFile(), activePistonOscillationParameterSidebarAvailable: false, settingsLanguagePreference: 'en' as const,
  setScanInputToast: (value: unknown) => { toast = value as string; }, pushLog: log,
  setParametersCollapsed: (value: unknown) => { collapsed = value as boolean; }, getPistonOscillationParameterSidebarFreeOnlyMessage: () => 'free only',
};
createWorkbenchParameterSidebarActions(railPorts).openParameterSidebarFromRail();
assert.equal(collapsed, true); assert.equal(toast, 'free only'); assert.equal(messages.length, 1);
createWorkbenchParameterSidebarActions({ ...railPorts, activePistonOscillationParameterSidebarAvailable: true }).openParameterSidebarFromRail();
assert.equal(collapsed, false); assert.equal(messages.length, 1);
createWorkbenchParameterSidebarActions(railPorts).showParameterSidebarBlockReason(() => null); assert.equal(messages.length, 1);

let file: WorkbenchFileState = createDefaultIdealFile(2); const initial = file; const events: string[] = [];
const standardRuntimeRef = { current: {} as Record<string, StandardEngineRuntime> }; const idealRuntimeRef = { current: {} as Record<string, StandardEngineRuntime> };
const actions = useWorkbenchExperimentParameterActions({ parameters: {
  getActiveFile: () => file, getParameterControlsLocked: () => false, getParametersDirty: () => false,
  workbenchCopy: workbenchCopies.en, getLockedIdealControlledVariableKeys: () => [],
  showWorkbenchValidationErrors: () => { throw Error('unexpected validation'); }, captureUndoSnapshot: () => { events.push('history'); },
  updateActiveFile: update => { assert.ok(idealRuntimeRef.current[file.id]); events.push('commit'); file = update(file); },
  standardRuntimeRef, idealRuntimeRef, cancelRuntimeFrame: () => { events.push('cancel'); },
  getStandardRuntime: current => standardRuntimeRef.current[current.id] ?? null, getIdealRuntime: current => idealRuntimeRef.current[current.id] ?? null,
  snapshotParticles: engine => engine.particles.map(particle => ({ ...particle })), setParameterInputDrafts: () => {}, setParameterErrors: () => {}, pushLog: log,
}, ideal: {
  getActiveFile: () => file, getParameterControlsLocked: () => false, getScanInputDraft: () => '', getPendingRemovePointId: () => null, getPendingClearRelationKey: () => null,
  settingsLanguagePreference: 'en', captureUndoSnapshot: () => { events.push('ideal-history'); }, updateActiveFile: update => { file = update(file); },
  showWorkbenchValidationErrors: () => { throw Error('unexpected ideal validation'); }, scanInputRef: { current: null }, lastScanInputErrorRef: { current: null }, deferInputFocus: () => {},
  setPendingRemovePointId: () => {}, setPendingClearRelationKey: () => {}, setSamplingPresetMenuOpen: () => {}, setScanInputError: () => {}, setParameterErrors: () => {}, setScanInputToast: () => {}, setScanInputDraft: () => {}, setScanInputFocused: () => {}, pushLog: log,
} });
actions.applyIdealSamplingPreset({ key: 'stable', label: 'Stable', equilibriumTime: 6, statsDuration: 20 });
assert.deepEqual(events, ['history', 'cancel', 'commit'], 'sampling commits through the same parameter action owner, including history and runtime rebuild');
assert.equal(file.params.statsDuration, 20); assert.equal(idealRuntimeRef.current[file.id]!.engine.createSnapshot().params.statsDuration, 20);
assert.equal(file.kind, 'ideal'); if (file.kind !== 'ideal') throw Error('wrong kind'); assert.strictEqual(file.pointsByRelation, initial.pointsByRelation);
const before = idealRuntimeRef.current[file.id]; events.length = 0; file = { ...file, runState: 'running' };
actions.applyIdealSamplingPreset({ key: 'fast', label: 'Fast', equilibriumTime: 2, statsDuration: 4 });
assert.deepEqual(events, []); assert.strictEqual(idealRuntimeRef.current[file.id], before);
const presentation = selectWorkbenchParameterInteractionPresentation(file, workbenchCopies.en);
assert.equal(presentation.parameterControlsLocked, true); assert.equal(presentation.currentParameterControlsLocked, true);
assert.equal(presentation.parametersDirty, false); assert.deepEqual(presentation.getLockedIdealControlledVariableKeys({ ...file.params, N: file.params.N + 1 }), []);
const point = { id: 'one', relation: 'pt' as const, targetTemperature: 1, meanTemperature: 1, meanPressure: 2, idealPressure: 2, relativeGap: 0, timestamp: 1 };
const withPoint = { ...file, pointsByRelation: { ...file.pointsByRelation, pt: [point] } };
const locked = selectWorkbenchParameterInteractionPresentation(withPoint, workbenchCopies.en);
assert.equal(locked.isIdealControlledVariableLocked('N'), true); assert.equal(locked.isIdealControlledVariableLocked('targetTemperature'), false); assert.equal(locked.isIdealControlledVariableLocked('relation'), false);
assert.deepEqual(locked.getLockedIdealControlledVariableKeys({ ...file.params, N: file.params.N + 1, targetTemperature: 1.5 }), ['N']);
let errors: string[] = []; const beforeMessages = messages.length;
createWorkbenchParameterValidationActions({ activeFile: { name: 'current' }, settingsLanguagePreference: 'en', setParameterErrors: next => { errors = typeof next === 'function' ? next(errors) : next; }, pushLog: log }).showWorkbenchValidationErrors({ errors: ['untranslated validation'] });
assert.deepEqual(errors, ['untranslated validation']); assert.equal(messages.length, beforeMessages + 1); assert.equal(messages.at(-1), 'current: untranslated validation');
console.log('Workbench parameter composition, lock and sidebar behavior tests passed.');
