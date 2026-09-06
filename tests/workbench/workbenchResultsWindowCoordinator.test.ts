import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchIdealState,
  type WorkbenchStandardState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  activateIdealResultsTab,
  activateStandardResultsTab,
  closeIdealResultsWindowLayout,
  createIdealResultsTabClosePlan,
  createIdealResultsTabOpenPlan,
  createStandardResultsTabClosePlan,
  createStandardResultsTabOpenPlan,
  getIdealResultsTabState,
  getStandardResultsTabState,
} from '../../src/features/workbench/workbenchResultsWindowCoordinator.ts';
import {
  createDefaultWorkbenchLayoutDefaults,
} from '../../src/features/workbench/workbenchLayoutCompatibility.ts';

const defaults = createDefaultWorkbenchLayoutDefaults();
const now = 123_456;

const closedIdeal: WorkbenchIdealState = {
  ...createDefaultIdealFile(1),
  visiblePanels: ['preview', 'realtime'],
};
const idealOpenPlan = createIdealResultsTabOpenPlan(
  closedIdeal,
  'verification',
  { replaceOpenTabs: true },
  defaults.ideal,
  now,
);
assert.equal(idealOpenPlan.layoutChanged, true);
assert.deepEqual(idealOpenPlan.nextFile.visiblePanels, ['preview', 'realtime', 'results']);
assert.deepEqual(idealOpenPlan.nextFile.idealWindowLayout.openTabs, ['verification']);
assert.equal(idealOpenPlan.nextFile.idealWindowLayout.activeIdealResultTab, 'verification');
assert.equal(idealOpenPlan.nextFile.updatedAt, now);

const appendedIdealPlan = createIdealResultsTabOpenPlan(
  idealOpenPlan.nextFile,
  'experimentPoints',
  {},
  defaults.ideal,
  now + 1,
);
assert.deepEqual(appendedIdealPlan.nextFile.idealWindowLayout.openTabs, ['verification', 'experimentPoints']);
assert.equal(appendedIdealPlan.nextFile.idealWindowLayout.activeIdealResultTab, 'experimentPoints');

const activeOnlyIdealPlan = createIdealResultsTabOpenPlan(
  appendedIdealPlan.nextFile,
  'verification',
  {},
  defaults.ideal,
  now + 2,
);
assert.equal(activeOnlyIdealPlan.layoutChanged, false);
assert.equal(activeOnlyIdealPlan.nextFile.idealWindowLayout.activeIdealResultTab, 'verification');

const allIdealPlan = createIdealResultsTabOpenPlan(
  closedIdeal,
  'experimentPoints',
  { openAllTabs: true },
  defaults.ideal,
  now,
);
assert.deepEqual(allIdealPlan.nextFile.idealWindowLayout.openTabs, ['experimentPoints', 'verification']);

const activatedIdeal = activateIdealResultsTab(
  appendedIdealPlan.nextFile,
  'verification',
  defaults.ideal,
  now + 3,
);
assert.equal(activatedIdeal.idealWindowLayout.activeIdealResultTab, 'verification');
assert.equal(getIdealResultsTabState(activatedIdeal, 'verification', defaults.ideal), 'active');
assert.equal(getIdealResultsTabState(activatedIdeal, 'experimentPoints', defaults.ideal), 'open');
assert.equal(getIdealResultsTabState(closedIdeal, 'verification', defaults.ideal), 'off');

const idealClosePlan = createIdealResultsTabClosePlan(
  activatedIdeal,
  'verification',
  defaults.ideal,
  now + 4,
);
assert.equal(idealClosePlan.kind, 'close-tab');
if (idealClosePlan.kind === 'close-tab') {
  assert.deepEqual(idealClosePlan.nextFile.idealWindowLayout.openTabs, ['experimentPoints']);
  assert.equal(idealClosePlan.activeTab, 'experimentPoints');
}
const finalIdealClosePlan = createIdealResultsTabClosePlan(
  idealClosePlan.kind === 'close-tab' ? idealClosePlan.nextFile : activatedIdeal,
  'experimentPoints',
  defaults.ideal,
  now + 5,
);
assert.deepEqual(finalIdealClosePlan, { kind: 'close-window' });
const closedIdealLayout = closeIdealResultsWindowLayout(activatedIdeal, defaults.ideal, now + 6);
assert.equal(closedIdealLayout.visiblePanels.includes('results'), false);
assert.equal(closedIdealLayout.updatedAt, now + 6);

const closedStandard: WorkbenchStandardState = {
  ...createDefaultStandardFile(1),
  visiblePanels: ['preview', 'realtime'],
};
const standardOpenPlan = createStandardResultsTabOpenPlan(
  closedStandard,
  'figures',
  { replaceOpenTabs: true },
  now,
);
assert.equal(standardOpenPlan.layoutChanged, true);
assert.deepEqual(standardOpenPlan.nextFile.standardResultsLayout.openTabs, ['figures']);
assert.equal(standardOpenPlan.nextFile.standardResultsLayout.activeTab, 'figures');
assert.equal(getStandardResultsTabState(standardOpenPlan.nextFile, 'figures'), 'active');
assert.equal(getStandardResultsTabState(closedStandard, 'figures'), 'off');

const allStandardPlan = createStandardResultsTabOpenPlan(
  closedStandard,
  'summary',
  { openAllTabs: true },
  now,
);
assert.deepEqual(allStandardPlan.nextFile.standardResultsLayout.openTabs, ['summary', 'dataTable', 'figures']);

const activatedStandard = activateStandardResultsTab(
  allStandardPlan.nextFile,
  'dataTable',
  now + 1,
);
assert.equal(activatedStandard.standardResultsLayout.activeTab, 'dataTable');
assert.equal(getStandardResultsTabState(activatedStandard, 'dataTable'), 'active');
assert.equal(getStandardResultsTabState(activatedStandard, 'figures'), 'open');

const standardClosePlan = createStandardResultsTabClosePlan(
  activatedStandard,
  'dataTable',
  now + 2,
);
assert.equal(standardClosePlan.kind, 'close-tab');
if (standardClosePlan.kind === 'close-tab') {
  assert.deepEqual(standardClosePlan.nextFile.standardResultsLayout.openTabs, ['summary', 'figures']);
  assert.equal(standardClosePlan.activeTab, 'figures');
}
const finalStandard = createStandardResultsTabOpenPlan(
  closedStandard,
  'summary',
  { replaceOpenTabs: true },
  now,
).nextFile;
assert.deepEqual(
  createStandardResultsTabClosePlan(finalStandard, 'summary', now + 3),
  { kind: 'close-window' },
);

const coordinatorSource = readFileSync(
  new URL('../../src/features/workbench/workbenchResultsWindowCoordinator.ts', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(coordinatorSource, /export const createIdealResultsTabOpenPlan/);
assert.match(coordinatorSource, /export const createStandardResultsTabClosePlan/);
const actionSource = readFileSync(new URL('../../src/features/workbench/workbenchWindowActions.ts', import.meta.url), 'utf8');
assert.match(actionSource, /from '\.\/workbenchResultsWindowCoordinator\.ts'/);
assert.match(workbenchSource, /from '\.\/workbenchWindowActions\.ts'/);
assert.match(workbenchSource, /createWorkbenchWindowActions\(\{/);
assert.doesNotMatch(workbenchSource, /const normalizeIdealResultLayout =/);
assert.doesNotMatch(workbenchSource, /const pickNextOpenTab =/);

console.log('workbenchResultsWindowCoordinator tests passed');
