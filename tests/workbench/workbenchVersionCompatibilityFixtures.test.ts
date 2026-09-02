import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  decodeWorkbenchClosedFilesStorageEnvelope,
  decodeWorkbenchStorageEnvelope,
} from '../../src/features/workbench/workbenchPersistenceMigration.ts';
import {
  InMemoryWorkbenchPersistenceV3GenerationStore,
} from '../../src/features/workbench/persistenceV3/generationStore.ts';
import {
  commitWorkbenchPersistenceV3ProductionSnapshot,
  restoreWorkbenchPersistenceV3ProductionWorkspace,
} from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import type {
  WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';

type CompatibilityFixture = {
  fixtureSchemaVersion: number;
  sourceTag: string;
  sourceCommit: string;
  generatedBy: string;
  workspace: unknown;
  closedFiles: unknown;
  expectations: {
    activeFileId: string;
    selectedPanel: 'preview';
    openFileIds: string[];
    closedFileIds: string[];
    standard: {
      id: string;
      name: string;
      targetTemperature: number;
      finalSpeedBinCount: number;
    };
    ideal: {
      id: string;
      name: string;
      relation: 'pv';
      targetTemperature: number;
      pointId: string;
    };
    heatCapacity: {
      id: string;
      name: string;
      mode: 'free';
      trialId: string;
      u0: number;
      u1: number;
      u2: number;
      gamma: number;
      suspendedDemoSession: boolean;
    };
  };
};

const fixtureVersions = ['4.2.3', '5.1.1'] as const;

const assertFixtureFiles = (
  files: WorkbenchFileState[],
  fixture: CompatibilityFixture,
) => {
  const byId = new Map(files.map((file) => [file.id, file]));
  const standard = byId.get(fixture.expectations.standard.id);
  assert.equal(standard?.kind, 'standard');
  if (standard?.kind !== 'standard') {
    throw new Error('Expected a compatible standard-simulation file.');
  }
  assert.equal(standard.name, fixture.expectations.standard.name);
  assert.equal(
    standard.params.targetTemperature,
    fixture.expectations.standard.targetTemperature,
  );
  assert.equal(
    standard.finalChartData?.speed.length,
    fixture.expectations.standard.finalSpeedBinCount,
    'standard result bins must survive legacy decode and V3 round-trip',
  );

  const ideal = byId.get(fixture.expectations.ideal.id);
  assert.equal(ideal?.kind, 'ideal');
  if (ideal?.kind !== 'ideal') {
    throw new Error('Expected a compatible ideal-gas file.');
  }
  assert.equal(ideal.name, fixture.expectations.ideal.name);
  assert.equal(ideal.relation, fixture.expectations.ideal.relation);
  assert.equal(
    ideal.params.targetTemperature,
    fixture.expectations.ideal.targetTemperature,
  );
  assert.deepEqual(
    ideal.pointsByRelation.pv.map((point) => point.id),
    [fixture.expectations.ideal.pointId],
    'ideal-gas measurements must survive legacy decode and V3 round-trip',
  );

  const heatCapacity = byId.get(fixture.expectations.heatCapacity.id);
  assert.equal(heatCapacity?.kind, 'heatCapacity');
  if (heatCapacity?.kind !== 'heatCapacity') {
    throw new Error('Expected a compatible heat-capacity file.');
  }
  assert.equal(heatCapacity.name, fixture.expectations.heatCapacity.name);
  assert.equal(
    heatCapacity.heatCapacityMode,
    fixture.expectations.heatCapacity.mode,
    'the active heat-capacity mode must survive migration',
  );
  assert.equal(
    heatCapacity.heatCapacityFreeExperimentGroupStatus,
    'completed',
    'the completed Free experiment group must survive migration',
  );
  const trial = heatCapacity.heatCapacityFreeRunWorkspace.trials.find((candidate) => (
    candidate.id === fixture.expectations.heatCapacity.trialId
  ));
  assert.ok(trial, 'the completed Free trial must survive migration');
  assert.equal(trial.u0?.displayPressureMv, fixture.expectations.heatCapacity.u0);
  assert.equal(trial.u1?.displayPressureMv, fixture.expectations.heatCapacity.u1);
  assert.equal(trial.u2?.displayPressureMv, fixture.expectations.heatCapacity.u2);
  assert.ok(
    Math.abs(
      (trial.correctedSignals?.gamma ?? Number.NaN) -
        fixture.expectations.heatCapacity.gamma,
    ) < 1e-9,
    'the Free calculation result must survive migration',
  );
  assert.deepEqual(
    heatCapacity.heatCapacityFreeRealDomain.trials.map((candidate) => (
      candidate.id
    )),
    [fixture.expectations.heatCapacity.trialId],
    'the active Free domain must preserve its experiment group authority',
  );
  if (fixture.sourceTag === 'v5.1.1') {
    const migratedExperimentGroup = heatCapacity.heatCapacityFreeExperimentGroups.groups.find((group) => (
      group.runSeries.trials.some((candidate) => (
        candidate.id === fixture.expectations.heatCapacity.trialId
      ))
    ));
    assert.equal(migratedExperimentGroup?.scheme, 'real');
    assert.ok(
      migratedExperimentGroup,
      'v5.1.1 Free trials must be reachable through the experiment-group collection',
    );
  }
  const demoSession = heatCapacity.heatCapacityModeSessions.demo;
  if (fixture.expectations.heatCapacity.suspendedDemoSession) {
    assert.equal(
      demoSession.status,
      'suspended',
      'the v5 suspended Demo mode session must survive migration',
    );
    assert.equal(demoSession.snapshot?.mode, 'demo');
  } else {
    assert.equal(
      demoSession.status,
      'empty',
      'v4.2.3 should not invent a dormant mode session',
    );
  }
};

for (const version of fixtureVersions) {
  const fixture = JSON.parse(readFileSync(
    new URL(
      `../fixtures/workbench-compatibility/v${version}.json`,
      import.meta.url,
    ),
    'utf8',
  )) as CompatibilityFixture;
  assert.equal(fixture.fixtureSchemaVersion, 1);
  assert.equal(fixture.sourceTag, `v${version}`);
  assert.match(fixture.sourceCommit, /^[0-9a-f]{40}$/);
  assert.equal(
    fixture.generatedBy,
    'scripts/generateCompatibilityFixture.cjs',
  );

  const openResult = decodeWorkbenchStorageEnvelope(fixture.workspace);
  const closedResult =
    decodeWorkbenchClosedFilesStorageEnvelope(fixture.closedFiles);
  assert.equal(openResult.handled, true);
  assert.equal(closedResult.handled, true);
  assert.deepEqual(
    openResult.diagnostics.filter((diagnostic) => (
      diagnostic.level === 'error'
    )),
    [],
    `${version} open workspace should decode without file loss`,
  );
  assert.deepEqual(
    closedResult.diagnostics.filter((diagnostic) => (
      diagnostic.level === 'error'
    )),
    [],
    `${version} closed-file cache should decode without file loss`,
  );
  assert.deepEqual(
    openResult.session.files.map((file) => file.id),
    fixture.expectations.openFileIds,
  );
  assert.deepEqual(
    closedResult.files.map((file) => file.id),
    fixture.expectations.closedFileIds,
  );
  assert.equal(
    openResult.session.activeFileId,
    fixture.expectations.activeFileId,
  );
  assert.equal(
    openResult.session.selectedPanel,
    fixture.expectations.selectedPanel,
  );
  assertFixtureFiles(
    [...openResult.session.files, ...closedResult.files],
    fixture,
  );

  const store = new InMemoryWorkbenchPersistenceV3GenerationStore();
  await commitWorkbenchPersistenceV3ProductionSnapshot({
    store,
    namespace: `compatibility:${version}`,
    generationId: `fixture-${version}`,
    capturedAtMs: 1_721_000_000_000,
    snapshot: {
      files: openResult.session.files,
      closedFiles: closedResult.files,
      activeFileId: openResult.session.activeFileId,
      selectedPanel: openResult.session.selectedPanel,
    },
  });
  const restored = await restoreWorkbenchPersistenceV3ProductionWorkspace(
    store,
    `compatibility:${version}`,
  );
  assert.ok(restored, `${version} fixture should restore from verified V3`);
  assert.deepEqual(
    restored.files.map((file) => file.id),
    fixture.expectations.openFileIds,
  );
  assert.deepEqual(
    restored.closedFiles.map((file) => file.id),
    fixture.expectations.closedFileIds,
  );
  assert.equal(restored.activeFileId, fixture.expectations.activeFileId);
  assertFixtureFiles(
    [...restored.files, ...restored.closedFiles],
    fixture,
  );
}

console.log('workbenchVersionCompatibilityFixtures tests passed');
