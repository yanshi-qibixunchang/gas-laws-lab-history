import assert from 'node:assert/strict';
import { createWorkbenchTutorialHandoffActions, type WorkbenchTutorialHandoffPorts } from '../../src/features/workbench/workbenchTutorialHandoffActions.ts';
import { createLegacyUnlockedExperienceProfile, startExperimentTutorialProfile } from '../../src/features/learning/experimentLearningModel.ts';
import { createDefaultWorkbenchLayoutDefaults } from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { persistAppExperienceProfile } from '../../src/features/learning/experimentLearningStore.ts';
import { clearExperimentTutorialHandoff, persistExperimentTutorialHandoff } from '../../src/features/learning/workbenchTutorialCoordinator.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
const unlocked = createLegacyUnlockedExperienceProfile('zh-CN');
const initial = startExperimentTutorialProfile(unlocked, 'heatCapacity');
const nextTutorial = startExperimentTutorialProfile(unlocked, 'pistonOscillation');
const harness = () => {
  const events: string[] = [], values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const flags = { save: true, marker: true, profile: true, clear: true, ownership: true, commit: true };
  const ordinary = createDefaultStandardFile(1);
  let error: { message: string; retry: (() => void) | null } | null = null;
  let committed: { files: WorkbenchFileState[]; closed: WorkbenchFileState[]; id: string } | null = null;
  const ports: WorkbenchTutorialHandoffPorts = {
    setTutorialOperationError: value => { error = typeof value === 'function' ? value(error) : value; events.push(error ? 'error' : 'error:clear'); },
    setTutorialNoticeKind: value => events.push('notice:' + value), tutorialNoticeKindRef: { current: null },
    tutorialOrdinaryWorkspaceRef: { current: { files: [ordinary], closedFiles: [ordinary], activeFileId: ordinary.id, selectedPanel: 'preview' } },
    experienceProfilePersistedRef: { current: true }, experienceProfileRef: { current: initial }, tutorialActiveRef: { current: true },
    setExperienceProfile: () => events.push('profile:project'), experimentLearningChannelRef: { current: { publish: () => events.push('publish'), close: () => undefined } },
    workbenchLayoutDefaults: createDefaultWorkbenchLayoutDefaults(), resetHeatCapacitySceneUiState: () => events.push('heat:reset'), clearPistonOscillationTutorialPlayback: () => events.push('piston:clear'),
    selectedPanelRef: { current: 'preview' }, commitWorkbenchFileCollections: (files, closed, id) => { committed = { files, closed, id }; events.push('files:commit'); },
    applyHeatCapacityModeTransitionEvent: () => events.push('mode:synchronize'), setSelectedPanel: () => events.push('panel'), setSelectedFileId: () => events.push('selection'), setParametersCollapsed: () => events.push('parameters'), setLogs: () => events.push('logs'), settingsLanguagePreference: 'zh-CN',
    flushWorkspacePersistenceRef: { current: async () => { events.push('save'); return flags.save; } },
    commitExperienceProfile: () => { events.push('profile:commit'); if (!flags.commit) ports.setTutorialOperationError({ message: 'profile blocked', retry: null }); return flags.commit; }, replaceVisibleWorkspaceWithExperimentTutorial: () => events.push('tutorial:replace'),
    issuedWorkbenchFileIdsRef: { current: new Set([ordinary.id]) }, suspendActiveHeatCapacityModeForNavigation: () => { events.push('heat:suspend'); return true; }, hideGeneralSettings: () => events.push('settings:hide'),
    window: { localStorage: storage, hardSphereLabTutorial: { deactivate: async () => { events.push('deactivate'); } } } as unknown as Window,
  };
  const adapters: NonNullable<Parameters<typeof createWorkbenchTutorialHandoffActions>[1]> = {
    clearExperimentTutorialHandoff: () => { events.push('marker:clear'); return flags.clear ? clearExperimentTutorialHandoff(storage) : { ok: false, error: new Error('clear failed') }; },
    persistExperimentTutorialHandoff: (experiment, id) => { events.push('marker:write'); return flags.marker ? persistExperimentTutorialHandoff(experiment, id, storage, 100) : { ok: false, error: new Error('marker failed') }; },
    persistAppExperienceProfile: profile => { events.push('profile:write'); return flags.profile ? persistAppExperienceProfile(profile, storage) : { ok: false, error: new Error('profile failed') }; },
    releaseExperimentTutorialOwnership: () => { events.push('owner:release'); return true; }, takeOverExperimentTutorialOwnership: () => { events.push('owner:claim'); return flags.ownership; },
  };
  return { events, flags, ports, actions: createWorkbenchTutorialHandoffActions(ports, adapters), getError: () => error, getCommitted: () => committed };
};
{
 const h = harness(); h.flags.save = false; assert.equal(await h.actions.finalizeCompletedExperimentTutorialHandoff(), false); assert.deepEqual(h.events, ['save', 'error']); assert.ok(h.getError()?.retry);
}
{
 const h = harness(); h.flags.clear = false; assert.equal(await h.actions.finalizeCompletedExperimentTutorialHandoff(), false); assert.deepEqual(h.events, ['save', 'marker:clear', 'error']);
}
{
 const h = harness(); assert.equal(await h.actions.finalizeCompletedExperimentTutorialHandoff(), true); assert.deepEqual(h.events, ['save', 'marker:clear', 'owner:release', 'deactivate', 'error:clear', 'notice:all-unlocked']);
}
for (const failure of ['ownership', 'commit'] as const) {
 const h = harness(); h.flags[failure] = false; assert.equal(await h.actions.handoffUnlockedExperimentTutorial('heatCapacity', nextTutorial, () => undefined), false); assert.ok(!h.events.includes('tutorial:replace')); assert.ok(h.getError()?.retry);
}
{
 const h = harness(); assert.equal(await h.actions.handoffUnlockedExperimentTutorial('heatCapacity', nextTutorial, () => undefined), true); assert.deepEqual(h.events, ['owner:claim', 'profile:commit', 'tutorial:replace', 'notice:start-demo', 'error:clear']);
}
for (const failure of ['marker', 'profile'] as const) {
 const h = harness(); h.flags[failure] = false; assert.equal(await h.actions.handoffUnlockedExperimentTutorial('heatCapacity', unlocked, () => undefined), false); assert.equal(h.getCommitted(), null); assert.equal(h.ports.tutorialActiveRef.current, true); assert.ok(h.getError()?.retry); if (failure === 'profile') assert.deepEqual(h.events, ['marker:write', 'profile:write', 'marker:clear', 'error']);
}
{
 const h = harness(); assert.equal(await h.actions.handoffUnlockedExperimentTutorial('heatCapacity', unlocked, () => undefined), true);
 assert.deepEqual(h.events.slice(0,6), ['marker:write', 'profile:write', 'heat:suspend', 'heat:reset', 'files:commit', 'mode:synchronize']);
 const committed = h.getCommitted()!; assert.equal(committed.files.length, 1); assert.equal(committed.closed.length, 1, 'ordinary files are deduplicated before restoration'); assert.equal(committed.files[0].id, committed.id); assert.ok(!committed.id.startsWith('runtime:tutorial:')); assert.equal(h.ports.tutorialOrdinaryWorkspaceRef.current, null); assert.equal(h.ports.tutorialActiveRef.current, false);
 assert.ok(h.events.indexOf('publish') < h.events.indexOf('save')); assert.deepEqual(h.events.slice(-6), ['save', 'marker:clear', 'owner:release', 'deactivate', 'error:clear', 'notice:all-unlocked']);
}
console.log('workbenchTutorialHandoffActions tests passed');
