const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const workbenchCenterWorkspaceSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchCenterWorkspace.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchMenuBarSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchMenuBar.tsx', import.meta.url), 'utf8');
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
assert.doesNotMatch(componentSource, /copy\.files|files:\s*\{\s*locked:/, 'top commands should not retain the unused file-state copy branch');
assert.match(
  componentSource,
  /useEffect\(\(\) => \{[\s\S]*?if \(openMenu === 'new'\) return;[\s\S]*?setActiveSubmenu\(null\);[\s\S]*?setPinnedSubmenu\(null\);[\s\S]*?\}, \[openMenu\]\);/,
  'closing the experiment-files menu should clear transient nested-menu state',
);
assert.doesNotMatch(componentSource, /setFiles|setUndoStack|setWorkbenchLayoutDefaults/, 'top command view should not mutate workbench domain state directly');

assert.match(workbenchMenuBarSource, /<WorkbenchTopCommands/, 'workbench should mount the extracted top commands component');
assert.match(workbenchCenterWorkspaceSource, /onCreateFile=\{createFile\}/, 'workbench should connect file creation behavior');
assert.match(workbenchMenuBarSource, /onCreateFile=\{createFile\}/, 'workbench should connect file creation behavior');
assert.match(workbenchMenuBarSource, /onToggleWindowPanel=\{\(panelKey\) => runWindowMenuSwitch\(\(\) => toggleWindowPanel\(panelKey\)\)\}/, 'workbench should preserve window-menu undo behavior');
assert.match(workbenchSource, /const topMenuResultChildren: WorkbenchTopMenuResultChild\[\]/, 'workbench should build a typed result-child view model');
assert.doesNotMatch(workbenchSource, /renderWindowResultsChildRows|childRows:/, 'workbench should not retain embedded Window-menu child-row rendering');
assert.doesNotMatch(workbenchSource, /const renderTopMenu|const renderTopCommand|TopCommandSubmenu/, 'workbench should not retain legacy top-menu rendering state');

console.log('workbenchTopCommands tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchMenuBar \} from '\.\/WorkbenchMenuBar\.tsx';/);

assert.match(workbenchViewShellSource, /import \{ WorkbenchCenterWorkspace \} from '\.\/WorkbenchCenterWorkspace\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchMenuBar \} from '\.\/WorkbenchMenuBar\.tsx';/);
