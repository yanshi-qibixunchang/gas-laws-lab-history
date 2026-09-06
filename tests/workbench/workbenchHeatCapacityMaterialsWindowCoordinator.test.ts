const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchHeatCapacityMaterialsWindowSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityMaterialsWindow.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDefaultHeatCapacityFile,
  createDefaultStandardFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  closeHeatCapacityMaterialsWindow,
  createHeatCapacityMaterialsOpenAllPlan,
  createHeatCapacityMaterialsTabActivationPlan,
  createHeatCapacityMaterialsTabClosePlan,
  createHeatCapacityMaterialsTabOpenPlan,
  getHeatCapacityMaterialsTabState,
  getHeatCapacityMaterialsWindowState,
} from '../../src/features/workbench/workbenchHeatCapacityMaterialsWindowCoordinator.ts';

const now = 123_456;
const freeFile: WorkbenchHeatCapacityState = {
  ...createDefaultHeatCapacityFile(1),
  heatCapacityMode: 'free',
  visiblePanels: ['preview', 'realtime'],
  openHeatCapacityTabs: [],
  activeHeatCapacityTabId: null,
  heatCapacityMaterialsExpanded: false,
};

const recordsOpenPlan = createHeatCapacityMaterialsTabOpenPlan(freeFile, 'records', now);
assert.equal(recordsOpenPlan.kind, 'ready');
if (recordsOpenPlan.kind === 'ready') {
  assert.equal(recordsOpenPlan.wasOpen, false);
  assert.equal(recordsOpenPlan.selectedPanel, 'heatCapacityRecords');
  assert.deepEqual(recordsOpenPlan.nextFile.openHeatCapacityTabs, ['records']);
  assert.deepEqual(recordsOpenPlan.nextFile.visiblePanels, ['preview', 'realtime', 'heatCapacityRecords']);
  assert.equal(recordsOpenPlan.nextFile.activeHeatCapacityTabId, 'records');
  assert.equal(recordsOpenPlan.nextFile.heatCapacityMaterialsExpanded, true);
  assert.equal(recordsOpenPlan.nextFile.updatedAt, now);
}
assert.deepEqual(freeFile.openHeatCapacityTabs, [], 'open planning must not mutate the source file');

const recordsFile = recordsOpenPlan.kind === 'ready' ? recordsOpenPlan.nextFile : freeFile;
const recordsReopenPlan = createHeatCapacityMaterialsTabOpenPlan(recordsFile, 'records', now + 1);
assert.equal(recordsReopenPlan.kind, 'ready');
if (recordsReopenPlan.kind === 'ready') {
  assert.equal(recordsReopenPlan.wasOpen, true);
  assert.deepEqual(recordsReopenPlan.nextFile.openHeatCapacityTabs, ['records']);
}

const guideFile: WorkbenchHeatCapacityState = {
  ...freeFile,
  heatCapacityMode: 'guide',
};
assert.deepEqual(
  createHeatCapacityMaterialsTabOpenPlan(guideFile, 'review', now),
  { kind: 'ignored' },
  'guide mode must reject the Free-only process-review tab',
);
assert.deepEqual(
  createHeatCapacityMaterialsTabOpenPlan(createDefaultStandardFile(1), 'guide', now),
  { kind: 'ignored' },
);

const allOpenPlan = createHeatCapacityMaterialsOpenAllPlan(freeFile, now);
assert.equal(allOpenPlan.kind, 'ready');
if (allOpenPlan.kind === 'ready') {
  assert.deepEqual(allOpenPlan.nextFile.openHeatCapacityTabs, ['guide', 'records', 'review']);
  assert.deepEqual(
    allOpenPlan.nextFile.visiblePanels,
    ['preview', 'realtime', 'heatCapacityGuide', 'heatCapacityRecords', 'heatCapacityReview'],
  );
  assert.equal(allOpenPlan.nextFile.activeHeatCapacityTabId, 'guide');
  assert.equal(allOpenPlan.selectedPanel, 'heatCapacityGuide');
}
assert.deepEqual(createHeatCapacityMaterialsOpenAllPlan({
  ...freeFile,
  heatCapacityMode: null,
}, now), { kind: 'ignored' });

const allOpenFile = allOpenPlan.kind === 'ready' ? allOpenPlan.nextFile : freeFile;
const activateReviewPlan = createHeatCapacityMaterialsTabActivationPlan(allOpenFile, 'review', now + 1);
assert.equal(activateReviewPlan.kind, 'ready');
if (activateReviewPlan.kind === 'ready') {
  assert.equal(activateReviewPlan.selectedPanel, 'heatCapacityReview');
  assert.equal(activateReviewPlan.nextFile.activeHeatCapacityTabId, 'review');
}
assert.deepEqual(
  createHeatCapacityMaterialsTabActivationPlan(recordsFile, 'review', now),
  { kind: 'ignored' },
);

const activeMiddleFile: WorkbenchHeatCapacityState = {
  ...allOpenFile,
  activeHeatCapacityTabId: 'records',
};
const closeMiddlePlan = createHeatCapacityMaterialsTabClosePlan(activeMiddleFile, 'records', now + 2);
assert.equal(closeMiddlePlan.kind, 'ready');
if (closeMiddlePlan.kind === 'ready') {
  assert.deepEqual(closeMiddlePlan.nextFile.openHeatCapacityTabs, ['guide', 'review']);
  assert.equal(closeMiddlePlan.nextFile.activeHeatCapacityTabId, 'review');
  assert.equal(closeMiddlePlan.selectedPanel, 'heatCapacityReview');
  assert.equal(closeMiddlePlan.nextFile.visiblePanels.includes('heatCapacityRecords'), false);
}

const closeLastPlan = createHeatCapacityMaterialsTabClosePlan({
  ...allOpenFile,
  activeHeatCapacityTabId: 'review',
}, 'review', now + 3);
assert.equal(closeLastPlan.kind, 'ready');
if (closeLastPlan.kind === 'ready') {
  assert.equal(closeLastPlan.nextFile.activeHeatCapacityTabId, 'records');
  assert.equal(closeLastPlan.selectedPanel, 'heatCapacityRecords');
}

const closeInactivePlan = createHeatCapacityMaterialsTabClosePlan({
  ...allOpenFile,
  activeHeatCapacityTabId: 'review',
}, 'guide', now + 4);
assert.equal(closeInactivePlan.kind, 'ready');
if (closeInactivePlan.kind === 'ready') {
  assert.equal(closeInactivePlan.nextFile.activeHeatCapacityTabId, 'review');
  assert.equal(closeInactivePlan.selectedPanel, 'heatCapacityReview');
}

const closeFinalPlan = createHeatCapacityMaterialsTabClosePlan(recordsFile, 'records', now + 5);
assert.equal(closeFinalPlan.kind, 'ready');
if (closeFinalPlan.kind === 'ready') {
  assert.equal(closeFinalPlan.nextFile.activeHeatCapacityTabId, null);
  assert.equal(closeFinalPlan.selectedPanel, 'preview');
}
assert.deepEqual(
  createHeatCapacityMaterialsTabClosePlan(recordsFile, 'guide', now),
  { kind: 'ignored' },
);

assert.equal(getHeatCapacityMaterialsTabState(allOpenFile, 'guide'), 'active');
assert.equal(getHeatCapacityMaterialsTabState(allOpenFile, 'records'), 'open');
assert.equal(getHeatCapacityMaterialsTabState(freeFile, 'records'), 'off');
assert.equal(getHeatCapacityMaterialsTabState(createDefaultStandardFile(1), 'records'), 'off');

const staleGuideFile: WorkbenchHeatCapacityState = {
  ...guideFile,
  openHeatCapacityTabs: ['review', 'records'],
  activeHeatCapacityTabId: 'review',
};
assert.deepEqual(getHeatCapacityMaterialsWindowState(staleGuideFile), {
  openTabs: ['records'],
  activeTabId: 'records',
});
assert.equal(getHeatCapacityMaterialsWindowState(freeFile), null);

const closedWindowFile = closeHeatCapacityMaterialsWindow(allOpenFile, now + 6);
assert.deepEqual(closedWindowFile.openHeatCapacityTabs, []);
assert.equal(closedWindowFile.activeHeatCapacityTabId, null);
assert.deepEqual(closedWindowFile.visiblePanels, ['preview', 'realtime']);
assert.equal(closedWindowFile.updatedAt, now + 6);

const coordinatorSource = readFileSync(
  new URL('../../src/features/workbench/workbenchHeatCapacityMaterialsWindowCoordinator.ts', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(coordinatorSource, /export const createHeatCapacityMaterialsTabOpenPlan/);
assert.match(coordinatorSource, /export const createHeatCapacityMaterialsTabClosePlan/);
assert.match(workbenchHeatCapacityMaterialsWindowSource, /from '\.\/workbenchHeatCapacityMaterialsWindowCoordinator\.ts'/);
assert.doesNotMatch(workbenchSource, /const nextOpenTabs = activeFile\.openHeatCapacityTabs\.filter/);
assert.doesNotMatch(workbenchSource, /activeHeatCapacityTabId: tabId,/);

console.log('workbenchHeatCapacityMaterialsWindowCoordinator tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityMaterialsWindow \} from '\.\/WorkbenchHeatCapacityMaterialsWindow\.tsx';/);
