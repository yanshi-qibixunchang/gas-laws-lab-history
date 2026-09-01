import assert from 'node:assert/strict';
import type { HeatCapacityFreeExperimentGroupCollection } from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityFreeBatchProgress,
  selectActiveHeatCapacityFreeDomain,
} from '../../src/features/workbench/workbenchState.ts';
import {
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';

const started = freezeHeatCapacityFreeParametersForCurrentGroup(
  configureHeatCapacityFreeBatchWorkbenchState(
    createDefaultHeatCapacityFile(1),
    3,
    100,
  ),
  200,
);
const currentGroup = started.heatCapacityFreeExperimentGroups.groups.find(
  (group) => group.id === started.heatCapacityFreeExperimentGroups.currentGroupId,
);
assert.ok(currentGroup);
assert.equal(currentGroup.runSeries.batch.targetGroupCount, 3);

const staleBatchCache = {
  ...started.heatCapacityFreeBatch,
  targetGroupCount: 7 as const,
};
const staleCaches = {
  ...started,
  heatCapacityFreeBatch: staleBatchCache,
  heatCapacityFreeRealDomain: {
    ...started.heatCapacityFreeRealDomain,
    batch: staleBatchCache,
  },
};

assert.equal(
  selectActiveHeatCapacityFreeDomain(staleCaches).batch.targetGroupCount,
  3,
  'the current experiment group must override a stale parameter-domain batch cache',
);
assert.equal(
  getHeatCapacityFreeBatchProgress(staleCaches).targetGroupCount,
  3,
  'progress must be derived from the experiment-group authority',
);

const projected = projectWorkbenchPersistenceV3File(staleCaches, 1);
if (!projected.ok) throw new Error(projected.diagnostics[0]?.message);
assert.equal(projected.status, 'repaired-cache');
const projectedDomains = projected.value.fields.authoritative.freeDomains as {
  experimentGroups: HeatCapacityFreeExperimentGroupCollection;
};
const projectedCurrentGroup = projectedDomains.experimentGroups.groups.find(
  (group) => group.id === projectedDomains.experimentGroups.currentGroupId,
);
assert.ok(projectedCurrentGroup);
assert.equal(
  projectedCurrentGroup.runSeries.batch.targetGroupCount,
  3,
  'persistence capture must never let stale runtime mirrors overwrite group authority',
);

const restored = reprojectWorkbenchPersistenceV3File(projected.value, 1);
if (!restored.ok) throw new Error(restored.diagnostics[0]?.message);
if (restored.value.kind !== 'heatCapacity') {
  throw new Error('Expected a heat-capacity workbench file.');
}
const restoredHeatFile = restored.value;
assert.equal(restoredHeatFile.heatCapacityFreeBatch.targetGroupCount, 3);
assert.equal(restoredHeatFile.heatCapacityFreeRealDomain.batch.targetGroupCount, 3);
assert.equal(
  restoredHeatFile.heatCapacityFreeExperimentGroups.groups.find(
    (group) => group.id === restoredHeatFile.heatCapacityFreeExperimentGroups.currentGroupId,
  )?.runSeries.batch.targetGroupCount,
  3,
  'restore must rebuild runtime and parameter-domain mirrors from the group authority',
);

console.log('workbenchHeatCapacityGroupAuthority tests passed');
