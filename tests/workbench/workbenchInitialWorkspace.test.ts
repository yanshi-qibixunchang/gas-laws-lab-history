import assert from 'node:assert/strict';
import { createDefaultStandardFile, createDefaultIdealFile, WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import { createDefaultWorkbenchLayoutDefaults } from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import { createWorkbenchHeatCapacityRefreshSession } from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import { resolveWorkbenchInitialSession, selectWorkbenchInitialRefreshSession, type WorkbenchInitialSession } from '../../src/features/workbench/workbenchInitialSession.ts';
import { normalizeWorkbenchInitialFiles } from '../../src/features/workbench/workbenchInitialFilePresentation.ts';
import { EXPERIMENT_TUTORIAL_FILE_IDS } from '../../src/features/learning/workbenchTutorialCoordinator.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

const defaults = createDefaultWorkbenchLayoutDefaults();
const standard = createDefaultStandardFile();
const ideal = createDefaultIdealFile();
const heat = createDefaultHeatCapacityFile();
const piston = createDefaultHeatCapacityPistonOscillationFile();
const ordinary: WorkbenchInitialSession = { files: [standard, ideal, heat, piston], activeFileId: standard.id, selectedPanel: 'realtime' };
const makeInput = () => ({
  initialTutorialReconstruction: false, initialActiveTutorialExperiment: null,
  initialTutorialHandoffRecovery: false, initialTutorialHandoff: { status: 'missing', marker: null },
  initialOrdinarySession: ordinary, initialOrdinaryClosedFiles: [], readLayoutDefaults: () => defaults,
} satisfies Parameters<typeof resolveWorkbenchInitialSession>[0]);
{
  const input = makeInput();
  input.readLayoutDefaults = () => { throw Error('ordinary path must not reload defaults'); };
  assert.equal(resolveWorkbenchInitialSession(input), ordinary, 'ordinary startup preserves the session and all file references');
}
for (const experiment of ['heatCapacity', 'pistonOscillation'] as const) {
  let reads = 0;
  const tutorial = resolveWorkbenchInitialSession({ ...makeInput(), initialTutorialReconstruction: true,
    initialActiveTutorialExperiment: experiment, readLayoutDefaults: () => { reads++; return defaults; },
  });
  assert.equal(tutorial.files.length, 1);
  assert.equal(tutorial.activeFileId, EXPERIMENT_TUTORIAL_FILE_IDS[experiment]);
  assert.equal(tutorial.selectedPanel, 'preview');
  assert.equal(reads, 1);
  const handoff = { status: 'loaded' as const, marker: {
    schemaVersion: 1 as const, experiment, status: 'profile-unlocked-pending-file' as const,
    targetFileId: 'recovered-' + experiment, createdAtMs: 1000,
  } };
  const recovered = resolveWorkbenchInitialSession({ ...makeInput(), initialTutorialHandoffRecovery: true, initialTutorialHandoff: handoff });
  assert.equal(recovered.activeFileId, handoff.marker.targetFileId);
  assert.equal(recovered.files[0].kind, experiment === 'heatCapacity' ? 'heatCapacity' : 'heatCapacityPistonOscillation');
  if (recovered.files[0].kind === 'heatCapacity') assert.equal(recovered.files[0].heatCapacityMode, null, 'completed tutorial hands off into Explore');
  for (const closed of [false, true]) {
    const existing = { ...heat, id: handoff.marker.targetFileId };
    const restored = resolveWorkbenchInitialSession({ ...makeInput(), initialTutorialHandoffRecovery: true, initialTutorialHandoff: handoff,
      initialOrdinarySession: { ...ordinary, files: closed ? [standard] : [standard, existing] },
      initialOrdinaryClosedFiles: closed ? [existing] : [],
      readLayoutDefaults: () => { throw Error('existing target must be reused without creating a file'); },
    });
    assert.equal(restored.files[0], existing, 'open and cached handoff targets retain their exact domain reference');
  }
}
{
  const session = { ...ordinary, activeFileId: heat.id };
  const refresh = createWorkbenchHeatCapacityRefreshSession(heat.id, 'free', 1000);
  assert.equal(selectWorkbenchInitialRefreshSession(session, refresh), refresh);
  assert.equal(selectWorkbenchInitialRefreshSession(session, null), null);
  assert.equal(selectWorkbenchInitialRefreshSession(ordinary, refresh), null);
  assert.equal(selectWorkbenchInitialRefreshSession({ ...session, files: [standard] }, refresh), null);
  assert.equal(selectWorkbenchInitialRefreshSession({ ...session, files: [{ ...standard, id: heat.id }] }, refresh), null);
  assert.equal(selectWorkbenchInitialRefreshSession({ ...session, files: [{ ...heat, heatCapacityMode: 'guide' }] }, refresh), null);
}
const freeze = <T>(value: T): T => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
{
  const input = freeze([
    { ...standard, liveWorkspaceSplitRatio: 2 },
    { ...ideal, liveWorkspaceSplitRatio: -1 },
    { ...heat, name: 'Heat Capacity Ratio - 001', openHeatCapacityTabs: ['records', 'records', 'bogus', 'guide'], activeHeatCapacityTabId: 'review', heatCapacityTabContainerHeight: 0 },
    { ...piston, runState: 'running', liveWorkspaceSplitRatio: WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO },
  ] as WorkbenchFileState[]);
  const before = JSON.stringify(input);
  const result = normalizeWorkbenchInitialFiles(input, defaults, null);
  assert.equal(JSON.stringify(input), before, 'presentation initialization never mutates the saved files');
  for (const index of [0, 1]) {
    const actual = result[index]; const original = input[index];
    if (!('particles' in actual) || !('particles' in original)) throw Error('simulation fixture');
    assert.equal(actual.particles, original.particles);
  }
  const h = result[2]; if (h.kind !== 'heatCapacity') throw Error('heat fixture');
  assert.equal(h.name, 'Adiabatic Expansion - 001');
  assert.deepEqual(h.openHeatCapacityTabs, ['records', 'guide']);
  assert.equal(h.activeHeatCapacityTabId, 'records');
  assert.equal(h.heatCapacityTabContainerHeight, 0.5);
  assert.equal(h.heatCapacityModeSessions, heat.heatCapacityModeSessions);
  assert.equal(h.heatCapacityFreeRealDomain, heat.heatCapacityFreeRealDomain);
  assert.equal(result[3].runState, 'idle');
  assert.equal(result[3].liveWorkspaceSplitRatio, defaults.heatCapacityPistonOscillation.liveWorkspaceSplitRatio);
}
for (const phase of ['running', 'paused', 'idle'] as const) {
  const file = { ...createDefaultHeatCapacityFile(3), heatCapacityMode: 'demo' as const, runState: 'paused' as const };
  const refresh = createWorkbenchHeatCapacityRefreshSession(file.id, 'demo', 1000);
  refresh.demo.phase = phase;
  const result = normalizeWorkbenchInitialFiles([file], defaults, refresh);
  assert.equal(result[0].runState, phase === 'idle' ? 'paused' : phase);
  refresh.ui.layout.runState = 'idle';
  assert.equal(normalizeWorkbenchInitialFiles([file], defaults, refresh)[0].runState, 'idle', 'explicit refresh run-state precedes the Demo phase fallback');
  assert.equal(normalizeWorkbenchInitialFiles([file], defaults, { ...refresh, activeHeatCapacityFileId: 'other' })[0].runState, file.runState);
}
console.log('Workbench initial session ownership and presentation normalization tests passed.');
