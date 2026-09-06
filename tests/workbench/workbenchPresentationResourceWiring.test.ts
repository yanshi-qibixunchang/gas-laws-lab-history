import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = (name: string) => readFileSync(new URL(`../../src/features/workbench/${name}`, import.meta.url), 'utf8');
const source = read('WorkbenchStudioPrototype.tsx');
const ast = ts.createSourceFile('WorkbenchStudioPrototype.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const calls = new Map<string, ts.CallExpression[]>();
const visit = (node: ts.Node) => {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) { const list = calls.get(node.expression.text) ?? []; list.push(node); calls.set(node.expression.text, list); }
  ts.forEachChild(node, visit);
};
visit(ast);
const call = (name: string) => { const nodes = calls.get(name) ?? []; assert.equal(nodes.length, 1, `${name} has one owner`); return nodes[0]!; };
for (const name of ['useWorkbenchLayoutState', 'useWorkbenchFileTreeState', 'useWorkbenchConsoleState', 'useWorkbenchParameterInteractionState', 'useWorkbenchEditHistoryState']) {
  call(name);
  assert.doesNotMatch(read(`${name}.ts`), /use(?:Layout)?Effect\(/, `${name} initializes state without moving resource installation earlier`);
}
const order = ['useWorkbenchSidebarRefreshPersistence', 'useWorkbenchFileTreeSelectionProjection', 'useWorkbenchRenameRefProjection', 'useWorkbenchParameterScroll', 'useWorkbenchRenameFocus', 'useWorkbenchIdealInputEffects', 'useWorkbenchHeatParameterProjectionEffects', 'useWorkbenchParameterSidebarAvailability', 'useWorkbenchHeatParameterHelpEffects', 'useWorkbenchSamplingPresetDismiss', 'useWorkbenchConsoleScroll', 'useWorkbenchEditKeyboard', 'useWorkbenchFileMenuInteractions'];
for (let index = 1; index < order.length; index += 1) assert.ok(call(order[index - 1]!).pos < call(order[index]!).pos, `${order[index - 1]} must register before ${order[index]}`);
assert.match(call('useWorkbenchConsoleState').getText(ast), /getTutorialLogs: \(\) => \{[\s\S]*initialTutorialReconstruction \|\| initialTutorialHandoffRecovery/);
assert.match(call('useWorkbenchConsoleScroll').getText(ast), /consoleBodyRef, skipInitialConsoleScrollRef/);
assert.match(read('useWorkbenchConsoleScroll.ts'), /if \(skipInitialConsoleScrollRef\.current\) return;[\s\S]*body\.scrollTop = body\.scrollHeight;[\s\S]*\[consoleTab, displayedLogs\.length, logs\.length\]/);
assert.match(read('useWorkbenchFileTreeProjection.ts'), /\[activeFileId, files, selectedFileId\]/);
assert.match(read('useWorkbenchFileTreeProjection.ts'), /renamingFileIdRef\.current = renamingFileId;[\s\S]*\[renamingFileId\]/);
assert.match(read('useWorkbenchSidebarRefreshPersistence.ts'), /useLayoutEffect\([\s\S]*\[leftCollapsed, parametersCollapsed\]/);
assert.match(read('useWorkbenchIdealInputEffects.ts'), /\[activeFile\.kind, activeIdealRelation, activeFile\.params, scanInputFocused\]/);
assert.match(read('useWorkbenchIdealInputEffects.ts'), /window\.clearTimeout\(timeoutId\)/);
assert.match(read('useWorkbenchEditKeyboard.ts'), /createWorkbenchEditKeyboardHandler\(\{ \.\.\.ports, isEditableTarget: isEditableElement, getActiveElement: \(\) => document\.activeElement \}\)/);
assert.match(read('useWorkbenchEditKeyboard.ts'), /document\.addEventListener\('keydown', handleKeyDown\);[\s\S]*document\.removeEventListener\('keydown', handleKeyDown\)/);
assert.match(read('useWorkbenchParameterSidebarAvailability.ts'), /activeFile\.kind,[\s\S]*activeFile\.kind === 'heatCapacity' \? activeFile\.heatCapacityMode : null,[\s\S]*activePistonOscillationParameterSidebarAvailable,/);
console.log('Workbench presentation resource order and ownership tests passed.');

assert.match(call('useWorkbenchHeatParameterProjectionEffects').getText(ast), /heatCapacityController\.effects\.parameterProjection/);
assert.match(call('useWorkbenchHeatParameterHelpEffects').getText(ast), /heatCapacityController\.effects\.parameterHelp/);
const heatEffectPhases = read('useWorkbenchHeatEffectPhases.ts');
assert.match(heatEffectPhases, /function useWorkbenchHeatParameterProjectionEffects[\s\S]*?useEffect\(effects\.parameterProjection\.run, effects\.parameterProjection\.dependencies\)/);
assert.match(heatEffectPhases, /function useWorkbenchHeatParameterHelpEffects[\s\S]*?useEffect\(effects\.parameterHelpPointer\.run, effects\.parameterHelpPointer\.dependencies\);[\s\S]*?useEffect\(effects\.parameterHelpClick\.run, effects\.parameterHelpClick\.dependencies\)/);
for (const moduleName of ['useWorkbenchHeatParameterProjection.ts', 'useWorkbenchHeatParameterHelp.ts']) assert.doesNotMatch(read(moduleName), /useEffect\(/, 'Heat parameter effect collection must not install earlier effects in the controller');
