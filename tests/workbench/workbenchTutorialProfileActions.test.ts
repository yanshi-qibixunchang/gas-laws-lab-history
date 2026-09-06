import assert from 'node:assert/strict';
import { createWorkbenchTutorialProfileActions, type WorkbenchTutorialProfilePorts } from '../../src/features/workbench/workbenchTutorialProfileActions.ts';
import { createLegacyUnlockedExperienceProfile, startExperimentTutorialProfile } from '../../src/features/learning/experimentLearningModel.ts';
const initial = createLegacyUnlockedExperienceProfile('zh-CN');
const tutorial = startExperimentTutorialProfile(initial, 'heatCapacity');
const harness = () => {
  const events: string[] = [];
  const ports: WorkbenchTutorialProfilePorts = {
    experienceProfileRef: { current: initial }, experienceProfilePersistedRef: { current: false }, tutorialActiveRef: { current: false },
    setExperienceProfile: profile => { assert.equal(ports.experienceProfileRef.current, profile); assert.equal(ports.experienceProfilePersistedRef.current, true); events.push('project'); },
    experimentLearningChannelRef: { current: { publish: profile => { assert.equal(profile, ports.experienceProfileRef.current); events.push('publish'); }, close: () => undefined } },
    setTutorialOperationError: () => events.push('error'), setTutorialBlockedNoticeOpen: value => events.push('blocked:' + value), setOpenTopMenu: value => events.push('menu:' + value),
    persistAppExperienceProfile: profile => { events.push('persist'); return { ok: true, profile }; },
  };
  return { events, ports, actions: createWorkbenchTutorialProfileActions(ports) };
};
{
 const h = harness(); assert.equal(h.actions.commitExperienceProfile(tutorial), true);
 assert.deepEqual(h.events, ['persist', 'project', 'publish']); assert.equal(h.ports.tutorialActiveRef.current, true);
 assert.equal(h.actions.guardWorkbenchTutorialAction('export-file'), false); assert.deepEqual(h.events.slice(-2), ['menu:null', 'blocked:true']);
 assert.equal(h.actions.guardWorkbenchTutorialAction('help'), true);
 h.ports.experienceProfileRef.current = initial; assert.equal(h.actions.guardWorkbenchTutorialAction('export-file'), true, 'access reads the current profile at invocation');
}
{
 const h = harness(); h.ports.persistAppExperienceProfile = () => ({ ok: false, error: new Error('storage blocked') });
 const actions = createWorkbenchTutorialProfileActions(h.ports); assert.equal(actions.commitExperienceProfile(tutorial), false);
 assert.deepEqual(h.events, ['error']); assert.equal(h.ports.experienceProfileRef.current, initial); assert.equal(h.ports.experienceProfilePersistedRef.current, false); assert.equal(h.ports.tutorialActiveRef.current, false);
}
console.log('workbenchTutorialProfileActions tests passed');
