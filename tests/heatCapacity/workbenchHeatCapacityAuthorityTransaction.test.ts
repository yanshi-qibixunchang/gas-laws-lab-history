import assert from 'node:assert/strict';
import {
  selectCurrentHeatCapacityFreeExperimentGroup,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  restartHeatCapacityFreeBatchWorkbenchState,
  setHeatCapacityFreeParameterSchemeWorkbenchState,
  transactHeatCapacityFreeAuthority,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';

const assertActiveAuthoritySynchronized = (
  file: WorkbenchHeatCapacityState,
  message: string,
) => {
  const group = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  assert.ok(group, `${message}: expected a current experiment group`);
  assert.equal(
    group.scheme,
    file.heatCapacityFreeParameterScheme,
    `${message}: current group and active scheme must agree`,
  );
  const domain = group.scheme === 'ideal'
    ? file.heatCapacityFreeIdealDomain
    : file.heatCapacityFreeRealDomain;
  assert.deepEqual(domain.batch, group.runSeries.batch, `${message}: domain batch`);
  assert.deepEqual(domain.trials, group.runSeries.trials, `${message}: domain trials`);
  assert.deepEqual(domain.traceStore, group.runSeries.traceStore, `${message}: domain trace`);
  assert.deepEqual(file.heatCapacityFreeRunWorkspace.batch, group.runSeries.batch, `${message}: runtime batch`);
  assert.deepEqual(file.heatCapacityFreeRunWorkspace.trials, group.runSeries.trials, `${message}: runtime trials`);
  assert.deepEqual(
    file.heatCapacityFreeRunWorkspace.traceStore,
    group.runSeries.traceStore,
    `${message}: runtime trace`,
  );
};

const configured = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(1),
  3,
  100,
);
assertActiveAuthoritySynchronized(configured, 'configure');

const staleBatch = {
  ...configured.heatCapacityFreeRunWorkspace.batch,
  targetGroupCount: 7 as const,
};
const repaired = transactHeatCapacityFreeAuthority(
  {
    ...configured,
    heatCapacityFreeRunWorkspace: {
      ...configured.heatCapacityFreeRunWorkspace,
      batch: staleBatch,
    },
    heatCapacityFreeRealDomain: {
      ...configured.heatCapacityFreeRealDomain,
      batch: staleBatch,
    },
  },
  (authority) => authority,
);
assert.equal(repaired.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 3);
assertActiveAuthoritySynchronized(repaired, 'repair stale mirrors');

const idealDraft = setHeatCapacityFreeParameterSchemeWorkbenchState(
  repaired,
  'ideal',
  110,
);
assertActiveAuthoritySynchronized(idealDraft, 'switch draft to ideal');
assert.equal(idealDraft.heatCapacityFreeIdealDomain.gasType, 'air');

const realDraft = setHeatCapacityFreeParameterSchemeWorkbenchState(
  idealDraft,
  'real',
  120,
);
assertActiveAuthoritySynchronized(realDraft, 'switch draft back to real');

const started = freezeHeatCapacityFreeParametersForCurrentGroup(realDraft, 130);
assertActiveAuthoritySynchronized(started, 'start group');
const restarted = restartHeatCapacityFreeBatchWorkbenchState(started, 140);
assertActiveAuthoritySynchronized(restarted, 'restart group');

const projection = projectWorkbenchPersistenceV3File(restarted, 1);
if (!projection.ok) throw new Error(projection.diagnostics[0]?.message);
const restored = reprojectWorkbenchPersistenceV3File(projection.value, 1);
if (!restored.ok) throw new Error(restored.diagnostics[0]?.message);
if (restored.value.kind !== 'heatCapacity') {
  throw new Error('Expected a heat-capacity file after persistence round-trip.');
}
assertActiveAuthoritySynchronized(restored.value, 'persistence restore');

const abandoned = abandonHeatCapacityFreeExperimentGroupDraftWorkbenchState(
  configured,
  150,
);
assert.equal(abandoned.heatCapacityFreeExperimentGroups.currentGroupId, null);
assert.equal(abandoned.heatCapacityFreeRunWorkspace.batch.targetGroupCount, null);
assert.deepEqual(abandoned.heatCapacityFreeRunWorkspace.trials, []);
assert.deepEqual(abandoned.heatCapacityFreeRunWorkspace.traceStore.traceTrials, []);
assert.deepEqual(abandoned.heatCapacityFreeRealDomain.batch, abandoned.heatCapacityFreeRunWorkspace.batch);

console.log('workbenchHeatCapacityAuthorityTransaction tests passed');
