const archUseWorkbenchWorkspacePersistenceSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchWorkspacePersistence.ts', import.meta.url), 'utf8');
const refreshCaptureSource = readFileSync(new URL('../../src/features/workbench/workbenchHeatRefreshSessionCapture.ts', import.meta.url), 'utf8');
const refreshPresentationSource = readFileSync(new URL('../../src/features/workbench/workbenchRefreshPresentationCapture.ts', import.meta.url), 'utf8');
const archUseWorkbenchEditHistoryStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchEditHistoryState.ts', import.meta.url), 'utf8');
const archUseWorkbenchFileTreeStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchFileTreeState.ts', import.meta.url), 'utf8');
const runActionSource = readFileSync(new URL('../../src/features/workbench/workbenchExperimentRunActions.ts', import.meta.url), 'utf8');
const frameLoopSource = readFileSync(new URL('../../src/features/workbench/workbenchHardSphereFrameLoop.ts', import.meta.url), 'utf8');
const fileActionSource = readFileSync(new URL('../../src/features/workbench/workbenchFileActions.ts', import.meta.url), 'utf8');
const schedulerSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchWorkspacePersistenceScheduler.ts', import.meta.url), 'utf8');
const initialWorkspaceSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchInitialWorkspace.ts', import.meta.url), 'utf8');
const projectionSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchPersistenceProjection.ts', import.meta.url), 'utf8');
const collectionActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchFileCollectionActions.ts', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchPresentationSource } from 'node:fs';
const presentationWorkbenchEditLabelLocalizationSource = readWorkbenchPresentationSource(new URL('../../src/features/workbench/workbenchEditLabelLocalization.ts', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const historySource = readFileSync(new URL('../../src/features/workbench/workbenchEditHistoryActions.ts', import.meta.url), 'utf8');
const workbenchStudioCopySource = readFileSync(new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const sessionSource = readFileSync(new URL('../../src/features/workbench/workbenchSession.ts', import.meta.url), 'utf8');
const indexedDbPersistenceSource = readFileSync(new URL('../../src/features/workbench/workbenchIndexedDbPersistence.ts', import.meta.url), 'utf8');
const promptCopySource = readFileSync(new URL('../../src/features/workbench/workbenchPromptCopies.ts', import.meta.url), 'utf8');

const indexOfOrFail = (haystack: string, needle: string, message: string) => {
  const index = haystack.indexOf(needle);
  assert.notEqual(index, -1, message);
  return index;
};

assert.ok(workbenchStudioCopySource.includes('experimentFiles: string;'), 'menu copy should expose an Experiment Files top-level label');
assert.ok(workbenchStudioCopySource.includes('newExperiment: string;'), 'menu copy should expose a New Experiment submenu label');
assert.ok(workbenchStudioCopySource.includes('openExperiment: string;'), 'menu copy should expose an Open Experiment submenu label');
assert.ok(workbenchStudioCopySource.includes('noCachedExperiments: string;'), 'menu copy should expose an empty cached-experiment state');
assert.ok(workbenchStudioCopySource.includes('closeExperiment: string;'), 'file menu copy should expose Close Experiment');
assert.ok(promptCopySource.includes('closeRunningExperiment: (fileName: string) => WorkbenchConfirmationCopy;'), 'prompt copy should provide a running-close confirmation');

assert.match(initialWorkspaceSource,
  /const \[initialOrdinaryClosedFiles\] = useState\(\(\) => \{[\s\S]*loadClosedWorkbenchFiles\(\)\.map[\s\S]*prepareHeatCapacityFileForExploreOnOpen/,
  'startup loads cached closed files and normalizes heat-capacity files to Explore');
assert.match(source, /useWorkbenchInitialWorkspace\(\);[\s\S]*useWorkbenchWorkspaceCollectionState\(\{ initialSession, initialHeatCapacityRefreshSession, getInitialClosedFiles:/,
  'the current closed collection is initialized from the dedicated startup owner');
assert.match(source, /createWorkbenchFileCollectionActions\(\{/,
  'the workspace uses the dedicated collection commit lanes');

assert.match(
  projectionSource,
  /closedFilesRef\.current = closedFiles;[\s\S]*scheduleWorkspacePersistenceRef\.current\('semantic'\);[\s\S]*\}, \[activeFileId, closedFiles, selectedPanel\]\);/,
  'closed cached experiment changes should schedule the semantic IndexedDB workspace commit',
);
assert.match(
  projectionSource,
  /scheduleWorkspacePersistenceRef\.current\('runtime-checkpoint'\)[\s\S]*\}, \[activeFileId, files\]\);/,
  'high-frequency file ticks should use the throttled runtime-checkpoint lane',
);
assert.match(
  collectionActionsSource,
  /const updateRuntimeFileById = \([\s\S]*setFiles\(\(current\) => \{[\s\S]*filesRef\.current = next;[\s\S]*return next;/,
  'simulation-frame updates should bypass the semantic operation wrapper and feed only the runtime checkpoint effect',
);
assert.match(
  frameLoopSource,
  /const updateStandardFrameFile = finished[\s\S]*\? updateFileById[\s\S]*: updateRuntimeFileById;[\s\S]*updateStandardFrameFile\(file\.id/,
  'standard simulation frames should stay runtime-only until the finished result receives a semantic save',
);
assert.match(
  frameLoopSource,
  /if \(!finished\) \{[\s\S]*updateRuntimeFileById\(file\.id,[\s\S]*scheduleIdealFrame\(file\.id\)/,
  'ideal-gas collection frames should stay runtime-only while the final recorded point remains semantic',
);
assert.match(source, /readFiles: \(\) => filesRef\.current,[\s\S]*readClosedFiles: \(\) => closedFilesRef\.current,/, 'workspace persistence capture must retain distinct authoritative open and closed file collection readers');
assert.match(indexedDbPersistenceSource, /openFileIds: snapshot\.files\.map\(\(file\) => file\.id\),[\s\S]*closedFileIds: snapshot\.closedFiles\.map\(\(file\) => file\.id\),/, 'IndexedDB workspace metadata should preserve separate open and closed file ordering');
assert.ok(sessionSource.includes('loadClosedWorkbenchFiles'), 'session bootstrap should expose closed cached files loaded from IndexedDB');
assert.doesNotMatch(sessionSource, /persistClosedWorkbenchFiles/, 'the runtime session module should not retain the obsolete separate localStorage writer');

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
    && newMenuSource.indexOf("onCreateFile('heatCapacity')") < newMenuSource.indexOf("onCreateFile('heatCapacityPistonOscillation')")
    && newMenuSource.indexOf("onCreateFile('heatCapacityPistonOscillation')") < newMenuSource.indexOf("onCreateFile('standard')"),
  'New Experiment submenu should order entries as ideal / adiabatic / piston oscillation / standard',
);

assert.ok(fileActionSource.includes('const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {'), 'workbench should expose a close-file request handler');
assert.match(
  fileActionSource,
  /const requestCloseWorkbenchFile = \(file: WorkbenchFileState\) => \{[\s\S]*requestPromptConfirmation\(\{[\s\S]*id: `close-running-workbench-file:\$\{file\.id\}`[\s\S]*onConfirm: \(\) => closeWorkbenchFile\(file\.id\)/,
  'closing a running experiment should use the internal confirmation and close only after confirmation',
);
assert.ok(source.includes('commitWorkbenchFileCollections'), 'file collection changes should use one synchronous ownership boundary');
assert.match(
  collectionActionsSource,
  /assertUniqueWorkbenchFileCollections\(nextFiles, nextClosedFiles, nextActiveFileId\);[\s\S]*filesRef\.current = nextFiles;/,
  'global file identity ownership must be asserted before refs or React state are mutated',
);
assert.match(
  fileActionSource,
  /const index = getNextWorkbenchFileDisplayIndex\(kind, currentFiles\);[\s\S]*const fileId = createUniqueWorkbenchFileId\(kind, issuedWorkbenchFileIdsRef\.current\);[\s\S]*id: fileId/,
  'new experiment display numbering must be separate from its opaque persistent identity',
);
assert.match(
  historySource,
  /kind: 'workspace',[\s\S]*files: cloneWorkbenchFiles\(sourceFiles\),[\s\S]*closedFiles: cloneWorkbenchFiles\(closedFilesRef\.current\)/,
  'workspace undo snapshots must preserve both open and closed ownership collections',
);
assert.match(
  historySource,
  /const restoredClosedFiles = cloneWorkbenchFiles\(snapshot\.closedFiles\);[\s\S]*commitWorkbenchFileCollections\(restoredFiles, restoredClosedFiles, nextActiveFileId\)/,
  'workspace restore must atomically restore open and closed collections without duplicating an identity',
);
assert.match(source, /createWorkbenchEditHistoryActions\(\{/);
assert.match(archUseWorkbenchEditHistoryStateSource, /useState<WorkbenchEditSnapshot\[]>\(\[\]\)/);
assert.doesNotMatch(refreshCaptureSource, /undoStack|redoStack/, 'domain refresh capture must not serialize process-local history');
assert.doesNotMatch(refreshPresentationSource, /undoStack|redoStack/, 'ordinary refresh presentation must not serialize process-local history');assert.match(
  historySource,
  /const pushUndoSnapshot[\s\S]*undoStackRef\.current = nextUndoStack;[\s\S]*redoStackRef\.current = \[\];[\s\S]*setUndoStack/,
  'history refs must update synchronously before an immediate collection persistence flush',
);
assert.match(presentationWorkbenchEditLabelLocalizationSource, /'closed file': '关闭文件'/);
assert.match(presentationWorkbenchEditLabelLocalizationSource, /'reopened file': '重新打开文件'/);
assert.match(presentationWorkbenchEditLabelLocalizationSource, /'closed file': '關閉檔案'/);
assert.match(presentationWorkbenchEditLabelLocalizationSource, /'reopened file': '重新開啟檔案'/);
assert.match(
  fileActionSource,
  /const closeWorkbenchFile[\s\S]*captureUndoSnapshot\('closed file', 'workspace'\)[\s\S]*commitWorkbenchFileCollections/,
  'closing a file must participate in ordered workspace ownership history',
);
assert.match(
  fileActionSource,
  /const openClosedWorkbenchFile[\s\S]*captureUndoSnapshot\('reopened file', 'workspace'\)[\s\S]*commitWorkbenchFileCollections/,
  'reopening a cached file must participate in ordered workspace ownership history',
);
assert.ok(source.includes('openClosedWorkbenchFile'), 'closed cache should be reopenable');
assert.ok(fileActionSource.includes('const isClosingActiveFile = fileId === activeFileIdRef.current;'), 'closing inactive experiments should use the authoritative active-file ref');
assert.ok(fileActionSource.includes('if (isClosingActiveFile) {'), 'active-workspace cleanup should only run when the active experiment is closed');

const collectionCommitSource = collectionActionsSource.slice(
  indexOfOrFail(collectionActionsSource, 'const commitWorkbenchFileCollections = (', 'file collection commit boundary should exist'),
  indexOfOrFail(collectionActionsSource, 'const updateFileById = (', 'file update helper should follow the collection commit boundary'),
);
assert.match(
  collectionCommitSource,
  /filesRef\.current = nextFiles;[\s\S]*closedFilesRef\.current = nextClosedFiles;[\s\S]*activeFileIdRef\.current = nextActiveFileId;[\s\S]*setFiles\(nextFiles\);[\s\S]*setClosedFiles\(nextClosedFiles\);[\s\S]*setActiveFileId\(nextActiveFileId\);/,
  'open, closed, and active ownership refs must update before their React projections',
);

const assertCollectionCommitPrecedesFlush = (start: string, end: string, label: string) => {
  const section = fileActionSource.slice(
    indexOfOrFail(fileActionSource, start, `${label} handler should exist`),
    indexOfOrFail(fileActionSource, end, `${label} handler should have a stable end boundary`),
  );
  assert.ok(
    indexOfOrFail(section, 'commitWorkbenchFileCollections(', `${label} should commit collection ownership`) <
      indexOfOrFail(section, 'flushWorkspacePersistenceRef.current(', `${label} should flush persistence`),
    `${label} must update open/closed/active refs before an immediate persistence flush`,
  );
  assert.match(
    section,
    /activeModeCheckpointOverride[\s\S]*activateHeatCapacityFileModeSession\([\s\S]*flushWorkspacePersistenceRef\.current\(activeModeCheckpointOverride\)/,
    `${label} must carry the restored target mode checkpoint into its immediate persistence flush`,
  );
};
assertCollectionCommitPrecedesFlush(
  'const createFile = (kind: WorkbenchFileKind) => {',
  'const closeWorkbenchFile = (fileId: string) => {',
  'create-file',
);
assertCollectionCommitPrecedesFlush(
  'const closeWorkbenchFile = (fileId: string) => {',
  'const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {',
  'close-file',
);
assertCollectionCommitPrecedesFlush(
  'const openClosedWorkbenchFile = (fileId: string) => {',
  'const deleteWorkbenchFile = (fileId: string) => {',
  'reopen-file',
);
assertCollectionCommitPrecedesFlush(
  'const deleteWorkbenchFile = (fileId: string) => {',
  'const requestDeleteWorkbenchFile = (file: WorkbenchFileState) => {',
  'delete-file',
);

const workspaceSnapshotSource = readFileSync(new URL('../../src/features/workbench/workbenchWorkspacePersistenceActions.ts', import.meta.url), 'utf8');
assert.match(source, /useWorkbenchWorkspacePersistence\(\{[\s\S]*readCapturedAtMs: \(\) => desktopExitQuiescedAtMsRef\.current \?\? Date\.now\(\)/,
  'the capture adapter must retain the desktop exit clock anchor');
assert.match(archUseWorkbenchWorkspacePersistenceSource, /scheduleWorkspacePersistenceRef\.current = workspacePersistenceRequests\.schedule;[\s\S]*flushWorkspacePersistenceRef\.current = workspacePersistenceRequests\.flush;/,
  'the main workspace must use the dedicated persistence requests');
assert.match(workspaceSnapshotSource,
  /resolveWorkbenchActiveModeCheckpointOverride\([\s\S]*const refreshSession =[\s\S]*checkpointOverride\.provided \? null : ports\.buildRefreshSession\(snapshotCapturedAtMs\)[\s\S]*checkpointOverride\.provided[\s\S]*\? checkpointOverride\.checkpoint[\s\S]*: ports\.buildModeCheckpoint\(activePersistenceFile, snapshotCapturedAtMs\)/,
  'capture must distinguish absent and explicit-null target checkpoints');
assert.match(workspaceSnapshotSource,
  /const snapshot = ports\.capture\(activeModeCheckpointOverride\);\s*const scheduler = ports\.readScheduler\(\);\s*if \(!scheduler\) return false;\s*scheduler\.schedule\(\(\) => snapshot, 'lifecycle'\);/,
  'flush must materialize the target-file snapshot before awaiting an earlier save or React commit');
assert.match(
  archUseWorkbenchWorkspacePersistenceSource,
  /const flushWorkspaceAfterRunStateCommit = \(\) => \{[\s\S]*setTimeout\(\(\) => \{[\s\S]*persistWorkspaceLifecycleCheckpointRef\.current\(\)/,
  'pause and stop transitions should request an immediate lifecycle flush after React commits their run-state change',
);
assert.match(
  runActionSource,
  /const pauseActiveFile = \(\) => \{[\s\S]*updateActiveFile\([\s\S]*flushWorkspaceAfterRunStateCommit\(\)/,
  'pausing a standard or ideal experiment must not wait for the ordinary semantic debounce',
);
assert.match(
  runActionSource,
  /const stopActiveFile = \(\) => \{[\s\S]*terminateHeatCapacityAutoDemo\(\);[\s\S]*flushWorkspaceAfterRunStateCommit\(\);[\s\S]*runState: 'idle'[\s\S]*flushWorkspaceAfterRunStateCommit\(\)/,
  'stopping heat-capacity, standard, and ideal experiments should enter the immediate lifecycle persistence lane',
);

const schedulerLifecycleIndex = indexOfOrFail(source, 'useWorkbenchWorkspacePersistenceScheduler();', 'scheduler hook is installed');
const persistenceSchedulingEffectIndex = indexOfOrFail(source, 'useWorkbenchPersistenceProjection({', 'projection hook is installed');
assert.ok(schedulerLifecycleIndex < persistenceSchedulingEffectIndex,
  'scheduler setup must register before projection scheduling under StrictMode');
assert.match(schedulerSource,
  /workspacePersistenceSchedulerRef\.current = scheduler;[\s\S]*return \(\) => \{[\s\S]*workspacePersistenceSchedulerRef\.current === scheduler[\s\S]*workspacePersistenceSchedulerRef\.current = null;[\s\S]*scheduler\.dispose\(\);/,
  'cleanup disposes only its own scheduler so repeated setup can install a fresh instance');

const fileMenuSource = readFileSync(new URL('../../src/features/workbench/WorkbenchFileTree.tsx', import.meta.url), 'utf8');
assert.ok(fileMenuSource.includes('onContextMenu={(event) =>'), 'file tree rows should open the action menu on right click');
assert.ok(fileMenuSource.includes('requestCloseWorkbenchFile(file)'), 'file tree menu should include Close Experiment');
assert.ok(fileMenuSource.includes('requestDeleteWorkbenchFile(file)'), 'file tree menu should keep Delete');
assert.match(
  archUseWorkbenchFileTreeStateSource,
  /const \[selectedFileId, setSelectedFileId\] = useState\(\(\) => \{[\s\S]*?restoredSelectedFileId[\s\S]*?: initialSession\.activeFileId;/,
  'workbench should track selected experiment separately from the active experiment and restore that selection on heat-capacity refresh',
);
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

const fileTabsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchFileTabs.tsx', import.meta.url), 'utf8');
assert.ok(fileTabsSource.includes('className="studio-file-tab-close"'), 'each experiment tab should include a close button');
assert.ok(fileTabsSource.includes('requestCloseWorkbenchFile(file)'), 'tab close buttons should close the experiment');
assert.match(
  fileTabsSource,
  /className="studio-file-tab-select"[\s\S]*?onClick=\{\(\) => selectFile\(file\)\}/,
  'single-clicking an experiment tab should switch the active experiment',
);
assert.doesNotMatch(
  fileTabsSource,
  /onDoubleClick=\{\(\) => selectFile\(file\)\}/,
  'experiment tabs should follow browser conventions and not require double-click activation',
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

assert.ok(source.includes("from './workbenchEditLabelLocalization.ts'"), 'workbenchEditLabelLocalization must remain connected to the shell');

assert.match(source, /from '\.\/useWorkbenchEditHistoryState\.ts'/);
assert.match(source, /from '\.\/useWorkbenchFileTreeState\.ts'/);

assert.match(source, /from '\.\/useWorkbenchWorkspacePersistence\.ts'/);
