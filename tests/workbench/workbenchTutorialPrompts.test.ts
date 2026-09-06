import assert from 'node:assert/strict';
import { deriveWorkbenchTutorialPromptModel, type WorkbenchTutorialPromptModelInput } from '../../src/features/workbench/workbenchTutorialPromptModel.ts';
import { createWorkbenchTutorialPromptActions, type WorkbenchTutorialPromptActionPorts } from '../../src/features/workbench/workbenchTutorialPromptActions.ts';
import { EXPERIMENT_TUTORIAL_COPY } from '../../src/features/workbench/workbenchExperimentTutorialPresentation.ts';
const base: WorkbenchTutorialPromptModelInput = { tutorialNoticeKind: null, tutorialBlockedNoticeOpen: false, remoteTutorialOwnerActive: false, tutorialOperationError: null, activeTutorialExperiment: 'heatCapacity', activeTutorialExperimentName: '绝热膨胀', experimentTutorialCopy: EXPERIMENT_TUTORIAL_COPY['zh-CN'], settingsLanguagePreference: 'zh-CN', desktopWindowAvailable: false, reload: () => undefined };
assert.deepEqual(deriveWorkbenchTutorialPromptModel(Object.freeze(base)), { tutorialMilestoneNoticeRequest: null, tutorialBlockedNoticeRequest: null, remoteTutorialNoticeRequest: null, tutorialFailureConfirmation: null });
for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
 for (const kind of ['start-demo', 'resume-demo', 'guide-unlocked', 'resume-guide', 'all-unlocked'] as const) {
  const input = Object.freeze({ ...base, settingsLanguagePreference: language, experimentTutorialCopy: EXPERIMENT_TUTORIAL_COPY[language], tutorialNoticeKind: kind, tutorialBlockedNoticeOpen: true, remoteTutorialOwnerActive: true });
  const model = deriveWorkbenchTutorialPromptModel(input);
  assert.ok(model.tutorialMilestoneNoticeRequest!.id.endsWith(':' + kind));
  assert.deepEqual(model.tutorialMilestoneNoticeRequest!.dismiss, { closeButton: false, escape: false, backdrop: true });
  assert.deepEqual(model.tutorialBlockedNoticeRequest!.dismiss, { closeButton: true, escape: true, backdrop: true });
  assert.equal(model.remoteTutorialNoticeRequest!.body, input.experimentTutorialCopy.browserRemoteBody);
  assert.equal(deriveWorkbenchTutorialPromptModel({ ...input, desktopWindowAvailable: true }).remoteTutorialNoticeRequest!.actionLabel, input.experimentTutorialCopy.recheck);
 }
}
{
 const events: string[] = [];
 const ports: WorkbenchTutorialPromptActionPorts = { tutorialOperationError: { message: 'save blocked', retry: () => events.push('retry') }, setTutorialOperationError: value => { assert.equal(value, null); events.push('clear-error'); }, setTutorialBlockedNoticeOpen: value => events.push('blocked:' + value), tutorialOwnershipClaimRef: { current: force => events.push('claim:' + force) }, window: { close: () => events.push('close'), location: { reload: () => events.push('reload') } } as unknown as Window };
 const actions = createWorkbenchTutorialPromptActions(ports);
 actions.retryTutorialOperation(); assert.deepEqual(events.splice(0), ['clear-error', 'retry']);
 actions.dismissTutorialBlockedNotice(); actions.recheckTutorialOwnership(); assert.deepEqual(events.splice(0), ['blocked:false', 'claim:true']);
 actions.exitAfterTutorialFailure(); assert.deepEqual(events.splice(0), ['close']);
 const desktop = { ...ports, tutorialOperationError: null, window: { ...ports.window, hardSphereLabWindow: { close: () => { events.push('desktop-close'); return Promise.resolve(); } } } as unknown as Window };
 createWorkbenchTutorialPromptActions(desktop).recheckTutorialOwnership(); assert.deepEqual(events.splice(0), ['reload']);
 createWorkbenchTutorialPromptActions(desktop).exitAfterTutorialFailure(); assert.deepEqual(events.splice(0), ['desktop-close']);
 createWorkbenchTutorialPromptActions(desktop).retryTutorialOperation(); assert.deepEqual(events.splice(0), ['clear-error', 'reload']);
}
console.log('workbenchTutorialPrompts tests passed');
