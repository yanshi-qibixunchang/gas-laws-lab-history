import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  powerHeatCapacityWorkbenchFile,
  restartHeatCapacityFreeBatchWorkbenchState,
  selectHeatCapacityFreeActiveRunConfigSnapshot,
} from '../../src/features/workbench/workbenchState.ts';

const unconfiguredFile = createDefaultHeatCapacityFile(1);
assert.equal(
  freezeHeatCapacityFreeParametersForCurrentGroup(unconfiguredFile, 100),
  unconfiguredFile,
  'an unconfigured Free batch must not silently freeze with a default group count',
);

const unconfiguredPowerAttempt = powerHeatCapacityWorkbenchFile(
  unconfiguredFile,
  true,
  101,
);
assert.equal(unconfiguredPowerAttempt.powerOn, false);
assert.equal(unconfiguredPowerAttempt.heatCapacityFreeRunWorkspace.batch.targetGroupCount, null);
assert.equal(unconfiguredPowerAttempt.heatCapacityFreeRunWorkspace.batch.startedAtMs, null);
assert.equal(selectHeatCapacityFreeActiveRunConfigSnapshot(unconfiguredPowerAttempt), null);
assert.equal(unconfiguredPowerAttempt.heatCapacityFreeExperimentGroupStatus, 'draft');

const configuredFile = configureHeatCapacityFreeBatchWorkbenchState(
  unconfiguredFile,
  3,
  102,
);
const configuredPowerAttempt = powerHeatCapacityWorkbenchFile(
  configuredFile,
  true,
  103,
);
assert.equal(configuredPowerAttempt.powerOn, true);
assert.equal(configuredPowerAttempt.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 3);
assert.equal(configuredPowerAttempt.heatCapacityFreeRunWorkspace.batch.startedAtMs, 103);
assert.notEqual(selectHeatCapacityFreeActiveRunConfigSnapshot(configuredPowerAttempt), null);

const fileWithOpenReview = {
  ...configuredPowerAttempt,
  openHeatCapacityTabs: ['guide', 'review'] as typeof configuredPowerAttempt.openHeatCapacityTabs,
  activeHeatCapacityTabId: 'review' as const,
  visiblePanels: [
    ...configuredPowerAttempt.visiblePanels,
    'heatCapacityGuide',
    'heatCapacityReview',
  ] as typeof configuredPowerAttempt.visiblePanels,
};
const restartedFile = restartHeatCapacityFreeBatchWorkbenchState(
  fileWithOpenReview,
  104,
);
assert.deepEqual(restartedFile.openHeatCapacityTabs, ['guide']);
assert.equal(restartedFile.activeHeatCapacityTabId, 'guide');
assert.equal(restartedFile.visiblePanels.includes('heatCapacityReview'), false);
assert.equal(
  restartedFile.heatCapacityFreeRunWorkspace.batch.targetGroupCount,
  3,
  'restarting the current experiment group should preserve its configured experiment count',
);

const workbenchSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'workbench',
    'WorkbenchStudioPrototype.tsx',
  ),
  'utf8',
);
assert.match(
  workbenchSource,
  /const handleKeyDown = \(event: KeyboardEvent\) => \{\s*if \(activeHeatCapacityModalLocked\) return;/,
  'the calculation modal lock must suppress global Undo/Redo shortcuts',
);
assert.match(
  workbenchSource,
  /\[undoStack, redoStack, selectedPanel, activeHeatCapacityModalLocked\]/,
  'the global shortcut listener must refresh when the calculation modal lock changes',
);

console.log('workbenchHeatCapacityBatchLifecycleGuards tests passed');
