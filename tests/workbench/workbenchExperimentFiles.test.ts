import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const sessionSource = readFileSync(new URL('../../src/features/workbench/workbenchSession.ts', import.meta.url), 'utf8');

const indexOfOrFail = (haystack: string, needle: string, message: string) => {
  const index = haystack.indexOf(needle);
  assert.notEqual(index, -1, message);
  return index;
};

assert.ok(source.includes('experimentFiles: string;'), 'menu copy should expose an Experiment Files top-level label');
assert.ok(source.includes('newExperiment: string;'), 'menu copy should expose a New Experiment submenu label');
assert.ok(source.includes('openExperiment: string;'), 'menu copy should expose an Open Experiment submenu label');
assert.ok(source.includes('noCachedExperiments: string;'), 'menu copy should expose an empty cached-experiment state');
assert.ok(source.includes('closeExperiment: string;'), 'file menu copy should expose Close Experiment');
assert.ok(source.includes('confirmCloseRunningExperiment: (name: string) => string;'), 'copy should provide a running-close confirmation');

assert.ok(source.includes('const [closedFiles, setClosedFiles] = useState<WorkbenchFileState[]>(() => loadClosedWorkbenchFiles());'), 'workbench should load closed cached experiment files');
assert.ok(source.includes('persistClosedWorkbenchFiles(closedFiles);'), 'closed cached experiment files should persist separately from open files');
assert.ok(sessionSource.includes('WORKBENCH_CLOSED_FILES_STORAGE_KEY'), 'session storage should define a separate closed-file cache key');
assert.ok(sessionSource.includes('loadClosedWorkbenchFiles'), 'session storage should load closed cached files');
assert.ok(sessionSource.includes('persistClosedWorkbenchFiles'), 'session storage should persist closed cached files');

const newMenuSource = topCommandsSource.slice(
  indexOfOrFail(topCommandsSource, "if (openMenu === 'new')", 'experiment files menu should exist'),
  indexOfOrFail(topCommandsSource, "if (openMenu === 'edit')", 'edit menu should follow experiment files menu'),
);
assert.ok(newMenuSource.includes('studio-command-submenu'), 'Experiment Files menu should render second-level submenus');
assert.ok(newMenuSource.includes('copy.menus.newExperiment'), 'Experiment Files menu should include New Experiment');
assert.ok(newMenuSource.includes('copy.menus.openExperiment'), 'Experiment Files menu should include Open Experiment');
assert.ok(source.includes('const openableClosedFiles = closedFiles.filter'), 'Open Experiment submenu should list cached files not currently open');
assert.ok(newMenuSource.includes('onOpenClosedFile(file.id)'), 'Open Experiment entries should reopen cached files');
assert.ok(newMenuSource.includes('copy.menus.noCachedExperiments'), 'Open Experiment submenu should show an empty state');

assert.ok(
  newMenuSource.indexOf("onCreateFile('ideal')") < newMenuSource.indexOf("onCreateFile('heatCapacity')")
    && newMenuSource.indexOf("onCreateFile('heatCapacity')") < newMenuSource.indexOf("onCreateFile('standard')"),
  'New Experiment submenu should order entries as ideal / heat capacity / standard',
);

assert.ok(source.includes('const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {'), 'workbench should expose a close-file request handler');
assert.ok(source.includes('window.confirm(workbenchCopy.files.confirmCloseRunningExperiment(file.name))'), 'closing a running experiment should ask for confirmation');
assert.ok(source.includes('setClosedFiles((current) =>'), 'closing should move the experiment into the closed cache');
assert.ok(source.includes('openClosedWorkbenchFile'), 'closed cache should be reopenable');
assert.ok(source.includes('const isClosingActiveFile = fileId === activeFileId;'), 'closing inactive experiments should not reset the active workspace');
assert.ok(source.includes('if (isClosingActiveFile) {'), 'active-workspace cleanup should only run when the active experiment is closed');

const fileMenuSource = source.slice(
  indexOfOrFail(source, 'className={`studio-tree-row studio-file-row', 'file tree row should exist'),
  indexOfOrFail(source, '<section className="studio-tree-section">', 'panel tree section should follow file tree section'),
);
assert.ok(fileMenuSource.includes('onContextMenu={(event) =>'), 'file tree rows should open the action menu on right click');
assert.ok(fileMenuSource.includes('requestCloseWorkbenchFile(file)'), 'file tree menu should include Close Experiment');
assert.ok(fileMenuSource.includes('requestDeleteWorkbenchFile(file)'), 'file tree menu should keep Delete');
assert.ok(source.includes('const [selectedFileId, setSelectedFileId] = useState(initialSession.activeFileId);'), 'workbench should track selected experiment separately from the active experiment');
const fileRowSingleClickSource = fileMenuSource.slice(
  indexOfOrFail(fileMenuSource, 'onClick={() => {', 'file row single-click handler should exist'),
  indexOfOrFail(fileMenuSource, 'onDoubleClick={() => {', 'file row double-click handler should exist'),
);
assert.match(
  fileRowSingleClickSource,
  /onClick=\{\(\) => \{[\s\S]*?setSelectedFileId\(file\.id\);[\s\S]*?\}\}/,
  'single-clicking an experiment row should only select the row',
);
assert.match(
  fileMenuSource,
  /onDoubleClick=\{\(\) => \{[\s\S]*?selectFile\(file\);[\s\S]*?\}\}/,
  'double-clicking an experiment row should switch the active experiment',
);
assert.doesNotMatch(
  fileRowSingleClickSource,
  /selectFile\(file\)/,
  'single-clicking an experiment row should not switch the active experiment',
);

const fileTabsSource = source.slice(
  indexOfOrFail(source, '<div className="studio-file-tabs"', 'file tabs should exist'),
  indexOfOrFail(source, '<div className={`studio-workspace-shell', 'workspace shell should follow file tabs'),
);
assert.ok(fileTabsSource.includes('className="studio-file-tab-close"'), 'each experiment tab should include a close button');
assert.ok(fileTabsSource.includes('requestCloseWorkbenchFile(file)'), 'tab close buttons should close the experiment');
const fileTabSingleClickSource = fileTabsSource.slice(
  indexOfOrFail(fileTabsSource, 'className="studio-file-tab-select"', 'file tab select button should exist'),
  indexOfOrFail(fileTabsSource, 'onDoubleClick={() => selectFile(file)}', 'file tab double-click handler should exist'),
);
assert.match(
  fileTabSingleClickSource,
  /onClick=\{\(\) => setSelectedFileId\(file\.id\)\}/,
  'single-clicking an experiment tab should only select the tab',
);
assert.match(
  fileTabsSource,
  /onDoubleClick=\{\(\) => selectFile\(file\)\}/,
  'double-clicking an experiment tab should switch the active experiment',
);
assert.doesNotMatch(
  fileTabSingleClickSource,
  /selectFile\(file\)/,
  'single-clicking an experiment tab should not switch the active experiment',
);
assert.ok(styles.includes('.studio-file-row-selected'), 'CSS should style selected experiment rows separately from active rows');
assert.ok(styles.includes('.studio-file-tab-selected'), 'CSS should style selected experiment tabs separately from active tabs');

assert.match(
  styles,
  /\.studio-file-tab-close[\s\S]*\.studio-command-submenu[\s\S]*\.studio-command-submenu-panel/,
  'CSS should style tab close buttons and second-level experiment file menus',
);

assert.match(
  styles,
  /\.studio-command-submenu::after\s*\{[\s\S]*?left:\s*100%;[\s\S]*?width:\s*12px;[\s\S]*?pointer-events:\s*auto;/,
  'second-level experiment menus should keep a transparent hover bridge over the gap before the submenu panel',
);

console.log('workbenchExperimentFiles tests passed');

