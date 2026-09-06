import type { WorkbenchHeatCapacityNumberParameterRowProps } from '../../src/features/workbench/WorkbenchHeatCapacityNumberParameterRow.tsx';
import type { WorkbenchHeatCapacityParameterHelpProps } from '../../src/features/workbench/WorkbenchHeatCapacityParameterHelp.tsx';
import type { WorkbenchHeatCapacityPreviewProps } from '../../src/features/workbench/WorkbenchHeatCapacityPreview.tsx';
import { heatCapacityFreeBasicNumberParameters } from '../../src/features/heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import { selectHeatCapacityFreeAppliedParameterDraft } from '../../src/features/workbench/workbenchHeatCapacityFreeAuthorityTransaction.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { loadWorkbenchView } from './helpers/loadWorkbenchView.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createInitialLogs } from '../../src/features/workbench/workbenchConsolePresentation.ts';
import { getPistonOscillationShellCopy } from '../../src/features/pistonOscillation/pistonOscillationCopy.ts';
import type { WorkbenchSimulationParameterRowProps } from '../../src/features/workbench/WorkbenchSimulationParameterRow.tsx';
import type { WorkbenchHeatCapacityGasParameterRowProps } from '../../src/features/workbench/WorkbenchHeatCapacityGasParameterRow.tsx';
import type { WorkbenchDockHeaderProps } from '../../src/features/workbench/WorkbenchDockHeader.tsx';
import type { WorkbenchConsoleProps } from '../../src/features/workbench/WorkbenchConsole.tsx';

const copy = workbenchCopies['zh-CN'];
const load = <T>(name: string) => loadWorkbenchView<T>(
  new URL('../../src/features/workbench/' + name + '.tsx', import.meta.url),
);
type Element = React.ReactElement<Record<string, unknown>>;
const elements = (node: React.ReactNode): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children as React.ReactNode)];
};
const find = (node: React.ReactNode, predicate: (element: Element) => boolean) => {
  const element = elements(node).find(predicate);
  assert.ok(element, 'Expected a rendered control in the real view');
  return element;
};
const event = (node: Element, name: string, value?: unknown) => {
  const callback = node.props[name];
  assert.equal(typeof callback, 'function', name + ' must be wired');
  (callback as (event?: unknown) => void)(value);
};
const noElement = () => React.createElement('span');
const state = <T>(initial: T) => {
  let current = initial;
  return {
    value: () => current,
    set: (next: React.SetStateAction<T>) => {
      current = typeof next === 'function' ? (next as (old: T) => T)(current) : next;
    },
  };
};

const { WorkbenchSimulationParameterRow } = load<{
  WorkbenchSimulationParameterRow: (props: WorkbenchSimulationParameterRowProps) => React.ReactNode;
}>('WorkbenchSimulationParameterRow');
const drafts = state<Record<string, string>>({ N: '800' });
const errors = state<string[]>(['previous error']);
const commits: unknown[] = [];
const reverted: string[] = [];
const rowProps: WorkbenchSimulationParameterRowProps = {
  param: { key: 'N', label: 'N', value: '500', editable: true },
  workbenchCopy: copy, parameterControlsLocked: false,
  isIdealControlledVariableLocked: () => false, controlledVariableLockHint: 'locked',
  parameterInputDrafts: drafts.value(), settingsLanguagePreference: 'zh-CN',
  renderWorkbenchParameterSymbol: noElement, renderWorkbenchParameterHelpButton: noElement,
  setParameterInputDrafts: drafts.set, setParameterErrors: errors.set,
  commitWorkbenchParameterInput: (param, raw) => commits.push([param.key, raw]),
  revertWorkbenchParameterInput: (key) => reverted.push(key),
};
let row = WorkbenchSimulationParameterRow(rowProps);
assert.deepEqual(commits, [], 'Rendering must not commit parameters');
let input = find(row, (element) => element.type === 'input');
assert.equal(input.props.value, '800', 'Visible draft is the value offered to commit');
event(input, 'onChange', { target: { value: '801' } });
assert.deepEqual(drafts.value(), { N: '801' });
assert.deepEqual(errors.value(), []);
row = WorkbenchSimulationParameterRow({ ...rowProps, parameterInputDrafts: drafts.value() });
input = find(row, (element) => element.type === 'input');
event(input, 'onBlur');
let prevented = 0;
event(input, 'onKeyDown', { key: 'Enter', preventDefault: () => prevented++ });
event(input, 'onKeyDown', { key: 'Escape', preventDefault: () => prevented++ });
assert.deepEqual(commits, [['N', '801'], ['N', '801']]);
assert.deepEqual(reverted, ['N']);
assert.equal(prevented, 2);
const lockedInput = find(WorkbenchSimulationParameterRow({
  ...rowProps, isIdealControlledVariableLocked: () => true,
}), (element) => element.type === 'input');
assert.equal(lockedInput.props.disabled, true);

const { WorkbenchHeatCapacityGasParameterRow } = load<{
  WorkbenchHeatCapacityGasParameterRow: (props: WorkbenchHeatCapacityGasParameterRowProps) => React.ReactNode;
}>('WorkbenchHeatCapacityGasParameterRow');
const heatFile = createDefaultHeatCapacityFile(1);
heatFile.heatCapacityMode = 'free';
heatFile.runState = 'running';
const heatBefore = JSON.stringify(heatFile);
const gasEvents: string[] = [];
const gasRow = WorkbenchHeatCapacityGasParameterRow({
  activeFile: heatFile, settingsLanguagePreference: 'zh-CN',
  showHeatCapacityGasTypeLockHint: () => gasEvents.push('locked'),
  setHeatCapacityFreeGasType: (gas) => gasEvents.push(gas),
  renderHeatCapacityTooltipAnchor: (_id, _message, child) => React.createElement('span', null, child),
});
const selectedGas = find(gasRow, (element) => element.type === 'button' && element.props['aria-pressed'] === true);
assert.equal(selectedGas.props['aria-disabled'], true);
assert.equal(selectedGas.props.disabled, false, 'Locked controls retain their explanatory click');
event(selectedGas, 'onClick');
assert.deepEqual(gasEvents, ['locked'], 'Even the already selected gas shows the lock hint before any equality shortcut');
assert.equal(JSON.stringify(heatFile), heatBefore, 'Views must never mutate authoritative file state');

const { WorkbenchDockHeader } = load<{
  WorkbenchDockHeader: (props: WorkbenchDockHeaderProps) => React.ReactNode;
}>('WorkbenchDockHeader');
const standard = createDefaultStandardFile(1);
standard.runState = 'running';
const dockEvents: string[] = [];
const dockProps: WorkbenchDockHeaderProps = {
  panel: { key: 'preview', title: 'Preview', hint: 'Model', icon: null },
  activePistonOscillationDataProcessing: false, activePistonOscillationProcessReview: false,
  pistonOscillationCopy: getPistonOscillationShellCopy('zh-CN'),
  activePistonOscillationExpandedRealtime: false, activeFile: standard,
  renderHeatCapacityModeControl: noElement, renderPistonOscillationModeControl: noElement,
  toggleActiveFileRunState: () => dockEvents.push('toggle'), workbenchCopy: copy,
  stopActiveFile: () => dockEvents.push('stop'),
  closePistonOscillationProcessReview: () => dockEvents.push('close-review'),
};
const dock = WorkbenchDockHeader(dockProps);
event(find(dock, (element) => element.props['aria-label'] === copy.actions.pause), 'onClick');
event(find(dock, (element) => element.props['aria-label'] === copy.actions.stop), 'onClick');
assert.deepEqual(dockEvents, ['toggle', 'stop']);
const reviewDock = WorkbenchDockHeader({
  ...dockProps, panel: { ...dockProps.panel, key: 'realtime' },
  activePistonOscillationProcessReview: true,
});
event(find(reviewDock, (element) => element.props['aria-label'] === dockProps.pistonOscillationCopy.review.closeAria),
  'onClick', { stopPropagation: () => dockEvents.push('stop-propagation') });
assert.deepEqual(dockEvents.slice(-2), ['stop-propagation', 'close-review']);

const { WorkbenchConsole } = load<{
  WorkbenchConsole: (props: WorkbenchConsoleProps) => React.ReactNode;
}>('WorkbenchConsole');
const collapsed = state(false);
const consoleTab = state<WorkbenchConsoleProps['consoleTab']>('logs');
const logs = createInitialLogs('zh-CN');
const consoleView = WorkbenchConsole({
  consoleCollapsed: false, workbenchCopy: copy, startConsoleResize: () => {},
  setConsoleCollapsed: collapsed.set, consoleTab: consoleTab.value(), setConsoleTab: consoleTab.set,
  consoleBodyRef: { current: null }, logs, displayedLogs: logs, settingsLanguagePreference: 'zh-CN',
  consoleSummary: { counts: { info: 1, success: 0, warning: 0, error: 0 }, latest: logs[0], runtime: 'ready' },
});
event(find(consoleView, (element) => element.props.className === 'studio-console-toggle'), 'onClick');
event(find(consoleView, (element) => element.type === 'button' && element.props.children === copy.console.tabs.warnings), 'onClick');
assert.equal(collapsed.value(), true);
assert.equal(consoleTab.value(), 'warnings');

const shell = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
for (const [name, key] of [
  ['WorkbenchDockPanel', 'panel.key'],
  ['WorkbenchSimulationParameterRow', 'param.label'],
  ['WorkbenchHeatCapacityCheckboxParameterRow', 'definition.id'],
]) {
  const start = shell.indexOf('<' + name + '\n');
  assert.ok(start >= 0 && shell.slice(start, start + 180).includes('key={' + key + '}'),
    name + ' must preserve the original mapped element identity');
}
for (const name of ['renderHeatCapacityGuideLessonOverlay', 'renderPistonOscillationGuideLessonOverlay', 'renderPistonOscillationGuideStepPanel']) {
  const start = shell.indexOf('const ' + name + ' =');
  const end = shell.indexOf('\n  };', start);
  const wrapper = shell.slice(start, end);
  assert.ok(wrapper.includes('return null;') && wrapper.includes('return ('),
    name + ' must preserve null before handing an optional overlay to the scene');
}
console.log('workbenchViewComponents tests passed');

const { WorkbenchHeatCapacityNumberParameterRow } = load<{
  WorkbenchHeatCapacityNumberParameterRow: (props: WorkbenchHeatCapacityNumberParameterRowProps) => React.ReactNode;
}>('WorkbenchHeatCapacityNumberParameterRow');
const heatNumberEvents: unknown[] = [];
const heatTemperatureDefinition = heatCapacityFreeBasicNumberParameters.find(definition => definition.id === 'ambientTemperatureK')!;
const heatNumberProps: WorkbenchHeatCapacityNumberParameterRowProps = {
  definition: heatTemperatureDefinition, draft: selectHeatCapacityFreeAppliedParameterDraft(heatFile),
  scope: 'basic', disabled: false, heatCapacityBasicInputDrafts: { ambientTemperatureK: '20.125' },
  heatCapacityAdvancedInputDrafts: {}, heatCapacityBasicInputErrors: {}, heatCapacityAdvancedInputErrors: {},
  settingsLanguagePreference: 'zh-CN', renderHeatCapacityParameterLabel: noElement,
  changeHeatCapacityParameterInputDraft: (...args) => { heatNumberEvents.push(['change', ...args]); },
  commitHeatCapacityBasicParameterInput: (...args) => { heatNumberEvents.push(['commit', ...args]); },
};
const heatNumberInput = find(WorkbenchHeatCapacityNumberParameterRow(heatNumberProps), element => element.type === 'input');
assert.equal(heatNumberInput.props.value, '20.125');
event(heatNumberInput, 'onChange', { target: { value: '20.25' } });
event(heatNumberInput, 'onBlur');
event(heatNumberInput, 'onKeyDown', { key: 'Enter' });
assert.deepEqual(heatNumberEvents, [['change', 'basic', 'ambientTemperatureK', '20.25'], ['commit', 'ambientTemperatureK', '20.125'], ['commit', 'ambientTemperatureK', '20.125']]);
heatNumberEvents.length = 0;
const advancedNumberInput = find(WorkbenchHeatCapacityNumberParameterRow({ ...heatNumberProps, scope: 'advanced' }), element => element.type === 'input');
event(advancedNumberInput, 'onBlur');
event(advancedNumberInput, 'onKeyDown', { key: 'Enter' });
assert.deepEqual(heatNumberEvents, [], 'Advanced rows wait for the complete draft save');

const { WorkbenchHeatCapacityParameterHelp } = load<{
  WorkbenchHeatCapacityParameterHelp: (props: WorkbenchHeatCapacityParameterHelpProps) => React.ReactNode;
}>('WorkbenchHeatCapacityParameterHelp');
const heatHelpEvents: string[] = [];
const helpProps: WorkbenchHeatCapacityParameterHelpProps = {
  parameterId: 'ambientTemperatureK', modelEffect: 'temperature', visibleHeatCapacityParamHelpId: null,
  renderHeatCapacityTooltipPopover: () => null, pinnedHeatCapacityParamHelpId: null,
  hoverHeatCapacityParameterHelp: id => { heatHelpEvents.push('hover:' + id); },
  pinHeatCapacityParameterHelp: id => { heatHelpEvents.push('pin:' + id); },
  hideHeatCapacityHoverTooltip: () => { heatHelpEvents.push('hide'); },
};
const helpButton = find(WorkbenchHeatCapacityParameterHelp(helpProps), element => element.type === 'button');
event(helpButton, 'onMouseEnter', { currentTarget: {} });
event(helpButton, 'onClick', { currentTarget: {}, preventDefault: () => heatHelpEvents.push('prevent'), stopPropagation: () => heatHelpEvents.push('stop') });
assert.deepEqual(heatHelpEvents, ['hover:ambientTemperatureK', 'prevent', 'stop', 'pin:ambientTemperatureK']);

const { WorkbenchHeatCapacityPreview } = load<{
  WorkbenchHeatCapacityPreview: (props: WorkbenchHeatCapacityPreviewProps) => React.ReactNode;
}>('WorkbenchHeatCapacityPreview');
const previewChild = React.createElement('span', { id: 'preserved-scene' });
const previewFrame = WorkbenchHeatCapacityPreview({ mountAria: 'instrument', interactionLocked: false, onLockedPointer: () => undefined, children: previewChild });
assert.ok(React.isValidElement(previewFrame));
assert.equal((previewFrame as Element).props.children, previewChild);
assert.equal((previewFrame as Element).props['data-heat-capacity-preview-mount'], 'true');
console.log('Workbench Heat view event and slot tests passed.');
