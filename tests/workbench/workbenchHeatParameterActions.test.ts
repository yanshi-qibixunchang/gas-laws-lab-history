import assert from 'node:assert/strict';
import type React from 'react';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { selectHeatCapacityFreeAppliedParameterDraft } from '../../src/features/workbench/workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { createWorkbenchHeatParameterValidation } from '../../src/features/workbench/workbenchHeatParameterValidation.ts';
import { createWorkbenchHeatParameterActions, type createWorkbenchHeatParameterActionsPorts } from '../../src/features/workbench/workbenchHeatParameterActions.ts';
import { heatCapacityFreeBasicNumberParameters, heatCapacityFreeAdvancedNumberParameters } from '../../src/features/heatCapacity/heatCapacityFreeParameterPanelModel.ts';

const state = <T>(value: T) => ({ value, set(next: React.SetStateAction<T>) { this.value = typeof next === 'function' ? (next as (old: T) => T)(this.value) : next; } });
const validation = createWorkbenchHeatParameterValidation({ settingsLanguagePreference: 'zh-CN' });
const file = createDefaultHeatCapacityFile(71);
const draft = selectHeatCapacityFreeAppliedParameterDraft(file);
const temperature = heatCapacityFreeBasicNumberParameters.find(p => p.id === 'ambientTemperatureK')!;
for (const raw of ['', '  ', 'not a number', 'Infinity']) {
  assert.equal(validation.validateHeatCapacityFreeNumberValue(temperature, raw, draft).valid, false);
}
assert.deepEqual(validation.validateHeatCapacityFreeNumberValue(temperature, ' 20.125 ', draft), { valid: true, value: 293.275 });
assert.equal(validation.validateHeatCapacityFreeNumberValue(temperature, String(temperature.min - 1), draft).valid, false);
assert.equal(heatCapacityFreeAdvancedNumberParameters.find(p => p.id === 'pressureDangerMv'), undefined);
const conductance = heatCapacityFreeAdvancedNumberParameters.find(p => p.id === 'gasWallConductanceWPerK')!;
const maximum = validation.getHeatCapacityFreeParameterMaximum(conductance, draft);
assert.equal(maximum, 5);
assert.ok(validation.getHeatCapacityFreeValueTooLargeMessage(conductance, maximum!, 'en').includes('W/K'));

const filesRef = { current: [file] };
const basicDrafts = state<Record<string, string>>({ ambientTemperatureK: '20.125', ambientPressureKPa: '101.325' });
const basicErrors = state<Record<string, string>>({ ambientTemperatureK: 'old', ambientPressureKPa: 'unrelated' });
const advancedDrafts = state<Record<string, string>>({});
const advancedErrors = state<Record<string, string>>({});
const advancedOpen = state(false);
const advanced = state<typeof draft | null>(null);
const confirm = state(false);
const pinned = state<string | null>(null);
const hovered = state<string | null>(null);
const style = state<React.CSSProperties | undefined>(undefined);
const toast = state<string | null>(null);
let writes = 0;
let tutorialAllowed = true;
let sphere = false;
const logs: unknown[] = [];
const setter = <T>(s: ReturnType<typeof state<T>>) => (v: React.SetStateAction<T>) => s.set(v);
const ports: createWorkbenchHeatParameterActionsPorts = {
  filesRef, activeFileIdRef: { current: file.id }, activeFile: file,
  setParametersCollapsed: () => undefined,
  setHeatCapacityAdvancedOpen: setter(advancedOpen),
  setPinnedHeatCapacityParamHelpId: setter(pinned),
  setHoveredHeatCapacityParamHelpId: setter(hovered),
  setHeatCapacityParamHelpPopoverStyle: setter(style),
  settingsLanguagePreference: 'zh-CN', setScanInputToast: setter(toast),
  pushLog: (message) => { logs.push(message); },
  activeHeatCapacityFreeIdealReadonly: false, activeHeatCapacityFreeParameterLocked: false,
  ...validation,
  setHeatCapacityBasicInputErrors: setter(basicErrors),
  updateActiveFile: (updater) => { writes += 1; filesRef.current = [updater(filesRef.current[0]) as typeof file]; },
  setHeatCapacityBasicInputDrafts: setter(basicDrafts),
  setHeatCapacityHardSphereViewEnabled: (value) => { sphere = value; },
  setHeatCapacityRestoreDefaultConfirmOpen: setter(confirm),
  setHeatCapacityAdvancedDraft: setter(advanced),
  setHeatCapacityAdvancedInputDrafts: setter(advancedDrafts),
  setHeatCapacityAdvancedInputErrors: setter(advancedErrors),
  guardWorkbenchTutorialAction: () => tutorialAllowed,
  heatCapacityAdvancedInputDrafts: advancedDrafts.value,
};
let actions = createWorkbenchHeatParameterActions(ports);
actions.changeHeatCapacityParameterInputDraft('basic', 'ambientTemperatureK', '296');
assert.deepEqual(basicDrafts.value, { ambientTemperatureK: '296', ambientPressureKPa: '101.325' });
assert.deepEqual(basicErrors.value, { ambientPressureKPa: 'unrelated' });
assert.equal(writes, 0, 'Editing a visible draft cannot change the file');
actions.commitHeatCapacityBasicParameterInput('ambientTemperatureK', '20.125');
assert.equal(selectHeatCapacityFreeAppliedParameterDraft(filesRef.current[0]).ambientTemperatureK, 293.275);
assert.deepEqual(basicDrafts.value, { ambientPressureKPa: '101.325' });
assert.equal(writes, 1);
actions.commitHeatCapacityBasicParameterInput('ambientTemperatureK', 'bad');
assert.equal(writes, 1);
assert.ok(Object.hasOwn(basicErrors.value, 'ambientTemperatureK'));
assert.equal(logs.length, 0, 'An invalid-number inline error does not invent a warning toast');

tutorialAllowed = false;
actions.openHeatCapacityAdvancedSettings();
assert.equal(advancedOpen.value, false);
tutorialAllowed = true;
actions.openHeatCapacityAdvancedSettings();
assert.equal(advancedOpen.value, true);
assert.ok(advanced.value);
actions.cancelHeatCapacityAdvancedParameterDraft();
assert.equal(advancedOpen.value, false);
assert.equal(advanced.value, null);

actions = createWorkbenchHeatParameterActions({ ...ports, activeHeatCapacityFreeIdealReadonly: true });
actions.commitHeatCapacityBasicParameterInput('ambientTemperatureK', '297');
assert.equal(writes, 1);
assert.ok(toast.value);
actions.setHeatCapacityBasicCheckbox('hardSphereViewEnabled', true);
assert.equal(sphere, true, 'The visualization toggle preserves its exception to read-only parameter guards');
actions.openHeatCapacityRestoreDefaultConfirm();
assert.equal(confirm.value, false);

const original = JSON.stringify(filesRef.current[0]);
actions.showHeatCapacityGasTypeLockHint();
assert.ok(toast.value);
assert.equal(JSON.stringify(filesRef.current[0]), original, 'Explaining a locked already-selected gas must not write');

actions = createWorkbenchHeatParameterActions({ ...ports, heatCapacityAdvancedInputDrafts: { noiseMv: 'invalid' } });
actions.saveHeatCapacityAdvancedParameterDraft(draft);
assert.equal(writes, 1, 'An invalid advanced row blocks the complete draft transaction');
assert.ok(advancedErrors.value.noiseMv);
console.log('Workbench Heat parameter actions and validation tests passed.');
