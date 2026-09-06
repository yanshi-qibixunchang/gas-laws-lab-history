import assert from 'node:assert/strict';
import { connectWorkbenchTutorialOwnership, type WorkbenchTutorialOwnershipPorts } from '../../src/features/workbench/workbenchTutorialOwnership.ts';
import { createLegacyUnlockedExperienceProfile, startExperimentTutorialProfile } from '../../src/features/learning/experimentLearningModel.ts';
import type { ExperimentLearningChannelMessage } from '../../src/features/learning/experimentLearningChannel.ts';
import { EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY } from '../../src/features/learning/experimentLearningChannel.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
const unlocked = createLegacyUnlockedExperienceProfile('zh-CN');
const tutorial = startExperimentTutorialProfile(unlocked, 'heatCapacity');
const harness = (desktop = false) => {
  const events: string[] = [], listeners = new Map<string, (event?: unknown) => void>(), intervals = new Map<number, () => void>();
  const ordinary = createDefaultStandardFile(1); let receiver: ((message: ExperimentLearningChannelMessage) => void) | null = null;
  const channel = { publish: () => undefined, close: () => { events.push('channel:close'); } };
  const add = (key: string, fn: (event?: unknown) => void) => listeners.set(key, fn);
  const remove = (key: string, fn: (event?: unknown) => void) => { assert.equal(listeners.get(key), fn); listeners.delete(key); };
  const ports: WorkbenchTutorialOwnershipPorts = {
    tutorialActiveRef: { current: true }, experienceProfileRef: { current: tutorial }, setRemoteTutorialOwnerActive: value => events.push('remote:' + value),
    tutorialOwnershipAdoptionRef: { current: async () => { events.push('adopt'); } }, setTutorialOperationError: () => events.push('error'), tutorialOwnershipClaimRef: { current: () => undefined },
    tutorialOrdinaryWorkspaceRef: { current: null }, setExperienceProfile: () => events.push('profile:project'), experimentLearningChannelRef: { current: null }, setTutorialNoticeKind: value => events.push('notice:' + value),
    filesRef: { current: [ordinary] }, closedFilesRef: { current: [] }, activeFileIdRef: { current: ordinary.id }, selectedPanelRef: { current: 'preview' },
    refreshTutorialOrdinaryWorkspaceFromPersistence: async () => { events.push('refresh'); return { files: [ordinary], closedFiles: [], activeFileId: ordinary.id, selectedPanel: 'preview' }; },
    flushWorkspacePersistenceRef: { current: async () => { events.push('save'); return true; } }, initialTutorialEntryKind: 'resume', EXPERIMENT_TUTORIAL_INSTANCE_ID: 'owner-a',
    window: { hardSphereLabWindow: desktop ? {} : undefined, localStorage: {}, setInterval: (fn: () => void, ms: number) => { assert.equal(ms, 5000); intervals.set(1, fn); return 1; }, clearInterval: (id: number) => { intervals.delete(id); events.push('timer:clear'); }, addEventListener: (name: string, fn: (event?: unknown) => void) => add('window:' + name, fn), removeEventListener: (name: string, fn: (event?: unknown) => void) => remove('window:' + name, fn) } as unknown as Window,
    document: { visibilityState: 'visible', addEventListener: (name: string, fn: (event?: unknown) => void) => add('document:' + name, fn), removeEventListener: (name: string, fn: (event?: unknown) => void) => remove('document:' + name, fn) } as unknown as Document,
  };
  const adapters: NonNullable<Parameters<typeof connectWorkbenchTutorialOwnership>[1]> = {
    createExperimentLearningChannel: (_id, callback) => { receiver = callback; return channel; },
    claimExperimentTutorialOwnership: () => { events.push('owner:claim'); return true; }, takeOverExperimentTutorialOwnership: () => { events.push('owner:takeover'); return true; },
    releaseExperimentTutorialOwnership: () => { events.push('owner:release'); return true; }, mergeArchivedNamespacesIntoTutorialWorkspace: async workspace => workspace,
  };
  return { events, listeners, intervals, ports, channel, connect: () => connectWorkbenchTutorialOwnership(ports, adapters), receive: (profile: typeof tutorial) => receiver!({ type: 'profile-updated', sourceId: 'owner-b', profile }) };
};
{
 const h = harness(); const cleanup = h.connect(); assert.deepEqual(h.events, ['owner:claim', 'adopt']); assert.equal(h.listeners.size, 4); assert.equal(h.ports.experimentLearningChannelRef.current, h.channel);
 h.ports.tutorialOwnershipClaimRef.current(true); assert.deepEqual(h.events.slice(-2), ['owner:takeover', 'adopt']);
 const before = h.events.length; h.listeners.get('window:storage')!({ key: 'unrelated' }); assert.equal(h.events.length, before);
 h.listeners.get('window:storage')!({ key: EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY }); assert.deepEqual(h.events.slice(-2), ['owner:claim', 'adopt']);
 cleanup(); assert.equal(h.listeners.size, 0); assert.equal(h.intervals.size, 0); assert.equal(h.ports.experimentLearningChannelRef.current, null); assert.deepEqual(h.events.slice(-3), ['timer:clear', 'owner:release', 'channel:close']);
}
{
 const h = harness(); const cleanup = h.connect(); h.receive(tutorial); assert.ok(h.ports.tutorialOrdinaryWorkspaceRef.current); assert.notEqual(h.ports.tutorialOrdinaryWorkspaceRef.current!.files[0], h.ports.filesRef.current[0]); assert.ok(h.events.includes('refresh'));
 h.receive(unlocked); assert.equal(h.ports.tutorialActiveRef.current, false); assert.equal(h.ports.experienceProfileRef.current, unlocked); assert.equal(h.events.at(-1), 'remote:false'); cleanup();
}
{
 const h = harness(); const cleanup = h.connect(); const laterChannel = { publish: () => undefined, close: () => undefined }, laterClaim = () => undefined;
 h.ports.experimentLearningChannelRef.current = laterChannel; h.ports.tutorialOwnershipClaimRef.current = laterClaim; cleanup(); assert.equal(h.ports.experimentLearningChannelRef.current, laterChannel); assert.equal(h.ports.tutorialOwnershipClaimRef.current, laterClaim);
}
{
 const h = harness(true); const cleanup = h.connect(); assert.deepEqual(h.events, []); assert.deepEqual([...h.listeners.keys()], ['window:pagehide']); cleanup();
}
console.log('workbenchTutorialOwnership tests passed');
