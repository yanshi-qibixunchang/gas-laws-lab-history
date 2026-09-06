import assert from 'node:assert/strict';
import { createWorkbenchWindowActions } from '../../src/features/workbench/workbenchWindowActions.ts';
import { createDefaultStandardFile, createDefaultIdealFile, type WorkbenchPanelKey } from '../../src/features/workbench/workbenchFileState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import { createDefaultWorkbenchLayoutDefaults } from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import { createFilePresentationSnapshot } from '../../src/features/workbench/workbenchEditSnapshot.ts';
import { getHeatCapacityRealtimeCopy } from '../../src/features/workbench/workbenchHeatCapacityRealtimeCopy.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';

const createHarness = (initial: WorkbenchFileState) => {
  let file = initial;
  let selectedPanel: WorkbenchPanelKey = 'preview';
  let menuOpen = true;
  let allowed = true;
  let interleavedUpdate: ((file: WorkbenchFileState) => WorkbenchFileState) | null = null;
  const history: ReturnType<typeof createFilePresentationSnapshot>[] = [];
  const actions = createWorkbenchWindowActions({
    getActiveFile: () => file, getSelectedPanel: () => selectedPanel,
    workbenchLayoutDefaults: createDefaultWorkbenchLayoutDefaults(),
    heatCapacityRealtimeCopy: getHeatCapacityRealtimeCopy('zh-CN'),
    availablePanels: [{ key: 'results', title: 'Results', hint: '', icon: null }],
    idealResultWindowPanels: [{ key: 'experimentPoints', title: 'Points' }, { key: 'verification', title: 'Verification' }],
    resultsSections: [{ key: 'summary', title: 'Summary' }, { key: 'dataTable', title: 'Data' }, { key: 'figures', title: 'Figures' }],
    createIdealPanels: () => [], createResultsSections: () => [],
    getLocalizedWorkbenchPanelTitle: title => title,
    setSelectedPanel: panel => { selectedPanel = panel; },
    setResultsChildrenCollapsed: () => {}, setOpenTopMenu: () => { menuOpen = false; },
    captureUndoSnapshot: (_, scope) => {
      assert.equal(scope, 'presentation');
      history.push(createFilePresentationSnapshot(file));
    },
    updateActiveFile: update => {
      if (interleavedUpdate) file = interleavedUpdate(file);
      interleavedUpdate = null;
      file = update(file);
    },
    setWorkbenchFiles: update => { file = update([file])[0]!; },
    guardWorkbenchTutorialAction: () => allowed, pushLog: () => {},
  });
  return { actions, history, getFile: () => file, getSelectedPanel: () => selectedPanel,
    isMenuOpen: () => menuOpen, setAllowed: (value: boolean) => { allowed = value; },
    interleave: (update: (file: WorkbenchFileState) => WorkbenchFileState) => { interleavedUpdate = update; } };
};

const ideal = createHarness(createDefaultIdealFile(1));
ideal.actions.openIdealResultWindow('verification');
let idealFile = ideal.getFile();
assert.equal(idealFile.kind, 'ideal');
if (idealFile.kind !== 'ideal') throw new Error('wrong file');
assert.deepEqual(idealFile.idealWindowLayout.openTabs, ['verification']);
assert.equal(ideal.getSelectedPanel(), 'verification');
ideal.actions.toggleWindowIdealResultTab('experimentPoints');
idealFile = ideal.getFile();
if (idealFile.kind !== 'ideal') throw new Error('wrong file');
assert.deepEqual(idealFile.idealWindowLayout.openTabs, ['verification', 'experimentPoints']);
const beforeActivation = ideal.history.length;
ideal.actions.setActiveIdealResultTab('verification');
ideal.actions.openIdealResultTab('verification');
assert.equal(ideal.history.length, beforeActivation);
ideal.actions.closeIdealResultTab('experimentPoints');
const beforeLastClose = ideal.history.length;
ideal.actions.closeIdealResultTab('verification');
assert.equal(ideal.history.length, beforeLastClose + 1, 'last-tab close must create exactly one history entry');
assert.equal(ideal.getFile().visiblePanels.includes('results'), false);
ideal.actions.closeIdealResultsWindow();
assert.equal(ideal.history.length, beforeLastClose + 1);
ideal.actions.runWindowMenuSwitch(() => ideal.actions.toggleWindowPanel('results'));
assert.equal(ideal.isMenuOpen(), false);
idealFile = ideal.getFile();
if (idealFile.kind !== 'ideal') throw new Error('wrong file');
assert.deepEqual(idealFile.idealWindowLayout.openTabs, ['experimentPoints', 'verification']);

const standard = createHarness(createDefaultStandardFile(1));
standard.actions.selectResultsSection('figures');
assert.equal(standard.getSelectedPanel(), 'results');
assert.equal(standard.history.length, 0, 'tree single-click must not open content');
standard.actions.selectResultsSection('figures', true);
standard.actions.toggleWindowStandardResultsTab('dataTable');
let standardFile = standard.getFile();
if (standardFile.kind !== 'standard') throw new Error('wrong file');
assert.deepEqual(standardFile.standardResultsLayout.openTabs, ['figures', 'dataTable']);
standard.actions.closeStandardResultsTab('figures');
const historyBeforeLast = standard.history.length;
standard.actions.closeStandardResultsTab('dataTable');
assert.equal(standard.history.length, historyBeforeLast + 1);
assert.equal(standard.getFile().visiblePanels.includes('results'), false);
standard.setAllowed(false);
standard.actions.toggleWindowPanel('results');
assert.equal(standard.history.length, historyBeforeLast + 1);
standard.setAllowed(true);
standard.interleave(file => ({ ...file, name: 'newer domain commit' }));
standard.actions.openStandardResultsWindow('summary', true);
assert.equal(standard.getFile().name, 'newer domain commit', 'the updater must replan against the latest file');
standardFile = standard.getFile();
if (standardFile.kind !== 'standard') throw new Error('wrong file');
assert.deepEqual(standardFile.standardResultsLayout.openTabs, ['summary', 'dataTable', 'figures']);
standard.actions.openPanel('preview');
assert.equal(standard.history.length, historyBeforeLast + 2, 'locked panels must not add history');

const piston = createHarness(createDefaultHeatCapacityPistonOscillationFile(1));
piston.actions.openHeatCapacityTab('records');
piston.actions.closeHeatCapacityMaterialsWindow();
assert.equal(piston.history.length, 0, 'adiabatic material actions must not affect piston files');
console.log('workbenchWindowActions tests passed');
