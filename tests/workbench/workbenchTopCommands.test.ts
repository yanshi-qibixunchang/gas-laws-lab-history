import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const componentSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(componentSource, /export type WorkbenchTopMenuId = 'new' \| 'edit' \| 'window' \| 'settings' \| 'help' \| null;/, 'top menu ids should use a shared constrained type');
assert.match(componentSource, /interface WorkbenchTopCommandsProps/, 'top commands should expose a typed view boundary');
assert.match(componentSource, /onCreateFile: \(kind: WorkbenchFileKind\) => void;/, 'file creation should remain an explicit controller callback');
assert.match(componentSource, /onToggleWindowPanel: \(panelKey: WorkbenchPanelKey\) => void;/, 'window panel changes should remain an explicit controller callback');
assert.match(componentSource, /onToggleWindowResultChild: \(child: WorkbenchTopMenuResultChild\) => void;/, 'result-child changes should remain an explicit controller callback');
assert.match(componentSource, /children: WorkbenchTopMenuResultChild\[\];/, 'window panels should expose structured result children instead of embedded JSX');
assert.match(
  componentSource,
  /useEffect\(\(\) => \{[\s\S]*?if \(openMenu === 'new'\) return;[\s\S]*?setActiveSubmenu\(null\);[\s\S]*?setPinnedSubmenu\(null\);[\s\S]*?\}, \[openMenu\]\);/,
  'closing the experiment-files menu should clear transient nested-menu state',
);
assert.doesNotMatch(componentSource, /setFiles|setUndoStack|setWorkbenchLayoutDefaults/, 'top command view should not mutate workbench domain state directly');

assert.match(workbenchSource, /<WorkbenchTopCommands/, 'workbench should mount the extracted top commands component');
assert.match(workbenchSource, /onCreateFile=\{createFile\}/, 'workbench should connect file creation behavior');
assert.match(workbenchSource, /onToggleWindowPanel=\{\(panelKey\) => runWindowMenuSwitch\(\(\) => toggleWindowPanel\(panelKey\)\)\}/, 'workbench should preserve window-menu undo behavior');
assert.match(workbenchSource, /const topMenuResultChildren: WorkbenchTopMenuResultChild\[\]/, 'workbench should build a typed result-child view model');
assert.doesNotMatch(workbenchSource, /renderWindowResultsChildRows|childRows:/, 'workbench should not retain embedded Window-menu child-row rendering');
assert.doesNotMatch(workbenchSource, /const renderTopMenu|const renderTopCommand|TopCommandSubmenu/, 'workbench should not retain legacy top-menu rendering state');

console.log('workbenchTopCommands tests passed');
