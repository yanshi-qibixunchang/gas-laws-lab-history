import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
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

assert.match(
  source,
  /const \[initialOrdinaryClosedFiles\] = useState\(\(\) => \{[\s\S]*loadClosedWorkbenchFiles\(\)\.map[\s\S]*prepareHeatCapacityFileForExploreOnOpen[\s\S]*const \[closedFiles, setClosedFiles\] = useState<WorkbenchFileState\[]>/,
  'workbench should load closed cached experiment files and normalize heat-capacity files to Explore',
);
assert.match(
  source,
  /closedFilesRef\.current = closedFiles;[\s\S]*scheduleWorkspacePersistenceRef\.current\('semantic'\);[\s\S]*\}, \[activeFileId, closedFiles, selectedPanel\]\);/,
  'closed cached experiment changes should schedule the semantic IndexedDB workspace commit',
);
assert.match(
  source,
  /scheduleWorkspacePersistenceRef\.current\('runtime-checkpoint'\)[\s\S]*\}, \[activeFileId, files\]\);/,
  'high-frequency file ticks should use the throttled runtime-checkpoint lane',
);
assert.match(
  source,
  /const updateRuntimeFileById = \([\s\S]*setFiles\(\(current\) => \{[\s\S]*filesRef\.current = next;[\s\S]*return next;/,
  'simulation-frame updates should bypass the semantic operation wrapper and feed only the runtime checkpoint effect',
);
assert.match(
  source,
  /const updateStandardFrameFile = finished[\s\S]*\? updateFileById[\s\S]*: updateRuntimeFileById;[\s\S]*updateStandardFrameFile\(file\.id/,
  'standard simulation frames should stay runtime-only until the finished result receives a semantic save',
);
assert.match(
  source,
  /if \(!finished\) \{[\s\S]*updateRuntimeFileById\(file\.id,[\s\S]*scheduleIdealFrame\(file\.id\)/,
  'ideal-gas collection frames should stay runtime-only while the final recorded point remains semantic',
);
assert.match(source, /files: filesRef\.current,[\s\S]*closedFiles: closedFilesRef\.current,/, 'workspace persistence snapshots should keep open and closed file collections distinct');
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

assert.ok(source.includes('const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {'), 'workbench should expose a close-file request handler');
assert.match(
  source,
  /const requestCloseWorkbenchFile = \(file: WorkbenchFileState\) => \{[\s\S]*requestPromptConfirmation\(\{[\s\S]*id: `close-running-workbench-file:\$\{file\.id\}`[\s\S]*onConfirm: \(\) => closeWorkbenchFile\(file\.id\)/,
  'closing a running experiment should use the internal confirmation and close only after confirmation',
);
assert.ok(source.includes('commitWorkbenchFileCollections'), 'file collection changes should use one synchronous ownership boundary');
assert.match(
  source.slice(
    indexOfOrFail(source, 'const commitWorkbenchFileCollections = (', 'file collection commit boundary should exist'),
    indexOfOrFail(source, 'const updateFileById = (', 'file update helper should follow the collection commit boundary'),
  ),
  /assertUniqueWorkbenchFileCollections\(nextFiles, nextClosedFiles, nextActiveFileId\);[\s\S]*filesRef\.current = nextFiles;/,
  'global file identity ownership must be asserted before refs or React state are mutated',
);
assert.match(
  source,
  /const index = getNextWorkbenchFileDisplayIndex\(kind, currentFiles\);[\s\S]*const fileId = createUniqueWorkbenchFileId\(kind, issuedWorkbenchFileIdsRef\.current\);[\s\S]*id: fileId/,
  'new experiment display numbering must be separate from its opaque persistent identity',
);
assert.match(
  source,
  /kind: 'workspace',[\s\S]*files: cloneWorkbenchFiles\(sourceFiles\),[\s\S]*closedFiles: cloneWorkbenchFiles\(closedFilesRef\.current\)/,
  'workspace undo snapshots must preserve both open and closed ownership collections',
);
assert.match(
  source,
  /const restoredClosedFiles = cloneWorkbenchFiles\(snapshot\.closedFiles\);[\s\S]*commitWorkbenchFileCollections\(restoredFiles, restoredClosedFiles, nextActiveFileId\)/,
  'workspace restore must atomically restore open and closed collections without duplicating an identity',
);
assert.match(source, /useState<WorkbenchEditSnapshot\[]>\(\[\]\)/);
assert.doesNotMatch(
  source.slice(
    indexOfOrFail(source, 'const buildCurrentHeatCapacityRefreshSession = (', 'refresh capture should exist'),
    indexOfOrFail(source, 'const persistCurrentHeatCapacityRefreshSession = (', 'refresh persistence should follow capture'),
  ),
  /undoStack|redoStack/,
  'process-local edit history must not restore unvalidated legacy snapshots after restart',
);
assert.match(
  source,
  /const pushUndoSnapshot[\s\S]*undoStackRef\.current = nextUndoStack;[\s\S]*redoStackRef\.current = \[\];[\s\S]*setUndoStack/,
  'history refs must update synchronously before an immediate collection persistence flush',
);
assert.match(source, /'closed file': '关闭文件'/);
assert.match(source, /'reopened file': '重新打开文件'/);
assert.match(source, /'closed file': '關閉檔案'/);
assert.match(source, /'reopened file': '重新開啟檔案'/);
assert.match(
  source,
  /const closeWorkbenchFile[\s\S]*captureUndoSnapshot\('closed file', 'workspace'\)[\s\S]*commitWorkbenchFileCollections/,
  'closing a file must participate in ordered workspace ownership history',
);
assert.match(
  source,
  /const openClosedWorkbenchFile[\s\S]*captureUndoSnapshot\('reopened file', 'workspace'\)[\s\S]*commitWorkbenchFileCollections/,
  'reopening a cached file must participate in ordered workspace ownership history',
);
assert.ok(source.includes('openClosedWorkbenchFile'), 'closed cache should be reopenable');
assert.ok(source.includes('const isClosingActiveFile = fileId === activeFileIdRef.current;'), 'closing inactive experiments should use the authoritative active-file ref');
assert.ok(source.includes('if (isClosingActiveFile) {'), 'active-workspace cleanup should only run when the active experiment is closed');

const collectionCommitSource = source.slice(
  indexOfOrFail(source, 'const commitWorkbenchFileCollections = (', 'file collection commit boundary should exist'),
  indexOfOrFail(source, 'const updateFileById = (', 'file update helper should follow the collection commit boundary'),
);
assert.match(
  collectionCommitSource,
  /filesRef\.current = nextFiles;[\s\S]*closedFilesRef\.current = nextClosedFiles;[\s\S]*activeFileIdRef\.current = nextActiveFileId;[\s\S]*setFiles\(nextFiles\);[\s\S]*setClosedFiles\(nextClosedFiles\);[\s\S]*setActiveFileId\(nextActiveFileId\);/,
  'open, closed, and active ownership refs must update before their React projections',
);

const assertCollectionCommitPrecedesFlush = (start: string, end: string, label: string) => {
  const section = source.slice(
    indexOfOrFail(source, start, `${label} handler should exist`),
    indexOfOrFail(source, end, `${label} handler should have a stable end boundary`),
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
  'const openNewWorkbenchWindow = () => {',
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

const workspaceSnapshotSource = source.slice(
  indexOfOrFail(source, 'const createWorkspacePersistenceSnapshot = (', 'workspace snapshot builder should exist'),
  indexOfOrFail(source, 'const handleHeatCapacityCameraPoseChange = (', 'camera persistence handler should follow the snapshot builder'),
);
assert.match(
  workspaceSnapshotSource,
  /const snapshotCapturedAtMs = desktopExitQuiescedAtMsRef\.current \?\? Date\.now\(\);[\s\S]*resolveWorkbenchActiveModeCheckpointOverride[\s\S]*const refreshSession =[\s\S]*checkpointOverride\.provided[\s\S]*\? null[\s\S]*: buildCurrentHeatCapacityRefreshSession\(null, snapshotCapturedAtMs\)[\s\S]*checkpointOverride\.provided[\s\S]*\? checkpointOverride\.checkpoint[\s\S]*: buildHeatCapacityModeUiCheckpoint\(activePersistenceFile, snapshotCapturedAtMs\)/,
  'an immediate file switch must distinguish absent, non-null, and explicit-null target checkpoints without reading the previous render',
);
assert.match(
  workspaceSnapshotSource,
  /flushWorkspacePersistenceRef\.current = async \(activeModeCheckpointOverride\) => \{\s*const snapshot = createWorkspacePersistenceSnapshot\(activeModeCheckpointOverride\);\s*const scheduler = workspacePersistenceSchedulerRef\.current;\s*if \(!scheduler\) return false;\s*scheduler\.schedule\(\(\) => snapshot, 'lifecycle'\);/,
  'flush must materialize the target-file snapshot before awaiting any earlier save or React projection commit',
);
assert.match(
  source,
  /const flushWorkspaceAfterRunStateCommit = \(\) => \{[\s\S]*setTimeout\(\(\) => \{[\s\S]*persistWorkspaceLifecycleCheckpointRef\.current\(\)/,
  'pause and stop transitions should request an immediate lifecycle flush after React commits their run-state change',
);
assert.match(
  source,
  /const pauseActiveFile = \(\) => \{[\s\S]*updateActiveFile\([\s\S]*flushWorkspaceAfterRunStateCommit\(\)/,
  'pausing a standard or ideal experiment must not wait for the ordinary semantic debounce',
);
assert.match(
  source,
  /const stopActiveFile = \(\) => \{[\s\S]*terminateHeatCapacityAutoDemo\(\);[\s\S]*flushWorkspaceAfterRunStateCommit\(\);[\s\S]*runState: 'idle'[\s\S]*flushWorkspaceAfterRunStateCommit\(\)/,
  'stopping heat-capacity, standard, and ideal experiments should enter the immediate lifecycle persistence lane',
);

const schedulerLifecycleIndex = indexOfOrFail(
  source,
  'workspacePersistenceSchedulerRef.current = scheduler;',
  'the persistence scheduler must be installed from an effect lifecycle',
);
const persistenceSchedulingEffectIndex = indexOfOrFail(
  source,
  'closedFilesRef.current = closedFiles;',
  'the workspace persistence scheduling effect should exist',
);
assert.ok(
  schedulerLifecycleIndex < persistenceSchedulingEffectIndex,
  'the scheduler lifecycle effect must run before the scheduling effect under React StrictMode',
);
assert.match(
  source.slice(schedulerLifecycleIndex, persistenceSchedulingEffectIndex),
  /return \(\) => \{[\s\S]*workspacePersistenceSchedulerRef\.current === scheduler[\s\S]*workspacePersistenceSchedulerRef\.current = null;[\s\S]*scheduler\.dispose\(\);/,
  'StrictMode cleanup must dispose only its own scheduler so the second effect setup can install a fresh instance',
);

const fileMenuSource = source.slice(
  indexOfOrFail(source, 'className={`studio-tree-row studio-file-row', 'file tree row should exist'),
  indexOfOrFail(source, '<section className="studio-tree-section">', 'panel tree section should follow file tree section'),
);
assert.ok(fileMenuSource.includes('onContextMenu={(event) =>'), 'file tree rows should open the action menu on right click');
assert.ok(fileMenuSource.includes('requestCloseWorkbenchFile(file)'), 'file tree menu should include Close Experiment');
assert.ok(fileMenuSource.includes('requestDeleteWorkbenchFile(file)'), 'file tree menu should keep Delete');
assert.match(
  source,
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

const fileTabsSource = source.slice(
  indexOfOrFail(source, '<div className="studio-file-tabs"', 'file tabs should exist'),
  indexOfOrFail(source, '<div className={`studio-workspace-shell', 'workspace shell should follow file tabs'),
);
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
