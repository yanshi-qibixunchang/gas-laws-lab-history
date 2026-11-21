import assert from 'node:assert/strict';
import type { PromptConfirmationRequest } from '../../src/components/prompts/PromptConfirmDialog.tsx';
import { APP_EXPERIENCE_PROFILE_STORAGE_KEY } from '../../src/features/learning/experimentLearningStore.ts';
import { EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY } from '../../src/features/learning/workbenchTutorialCoordinator.ts';
import { createDefaultAppExperienceProfile } from '../../src/features/learning/experimentLearningModel.ts';
import { createWorkbenchTutorialOverlayActions } from '../../src/features/workbench/workbenchTutorialOverlayActions.ts';

const profile = {
  ...createDefaultAppExperienceProfile(),
  firstRunCompleted: true,
  acceptedLegalVersion: 'accepted',
  activeTutorialExperiment: 'pistonOscillation' as const,
};

const createRestart = () => {
  const events: string[] = [];
  const records = new Map([
    [APP_EXPERIENCE_PROFILE_STORAGE_KEY, JSON.stringify(profile)],
    [EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY, 'pending handoff'],
    ['general-settings', 'kept'],
  ]);
  const behavior = {
    save: async () => true,
    allow: true,
    desktop: 'ok' as 'ok' | 'blocked' | 'error',
    failHandoff: false,
  };
  let confirmation: PromptConfirmationRequest | null = null;
  let retry: (() => void) | undefined;
  const firstRunRestartInProgress = { current: false };
  const actions = createWorkbenchTutorialOverlayActions({
    experienceProfileRef: { current: profile },
    learningNeedsDraft: { heatCapacity: null, pistonOscillation: null },
    setProductIntroReplayPhase: () => undefined,
    setLearningNeedsReselectOpen: () => undefined,
    setLearningNeedsDraft: () => undefined,
    setTutorialOperationError: (error) => {
      if (typeof error === 'object' && error) retry = error.retry;
      events.push('error');
    },
    settingsLanguagePreference: 'zh-CN',
    guardWorkbenchTutorialAction: () => { throw new Error('Ordinary tutorial restrictions must not block a first-run restart'); },
    requestPromptConfirmation: (request) => { confirmation = request; },
    startExperimentLearningTutorial: async () => undefined,
    exitExperimentLearningTutorial: async () => { throw new Error('Restart must not complete or unlock the outgoing tutorial'); },
    commitExperienceProfile: () => false,
    prepareDesktopExitQuiescenceRef: { current: () => { events.push('pause'); } },
    resumeDesktopExitQuiescenceRef: { current: () => { events.push('resume'); } },
    saveWorkspaceForFirstRunRestart: async () => {
      events.push('save');
      return behavior.save();
    },
    canRestartFirstRun: () => behavior.allow,
    firstRunRestartInProgress,
    hideGeneralSettings: () => { events.push('close-settings'); },
    window: {
      location: { reload: () => { events.push('first-run'); } },
      localStorage: {
        removeItem: (key: string) => {
          if (key === EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY && behavior.failHandoff) throw new Error('Storage failure');
          events.push(key);
          records.delete(key);
        },
      },
      hardSphereLabTutorial: {
        prepareFirstRunRestart: async () => {
          events.push('save-peers');
          return { status: behavior.desktop };
        },
        finishFirstRunRestart: async (completed: boolean) => { events.push(`release-peers:${completed}`); },
      },
    } as unknown as Window,
  });
  actions.requestRestartFirstRun();
  return {
    events, records, behavior, actions,
    confirm: () => {
      assert.ok(confirmation);
      confirmation.onConfirm();
    },
    retry: () => {
      assert.ok(retry);
      retry();
    },
  };
};

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const restart = createRestart();
assert.deepEqual(restart.events, [], 'opening or dismissing confirmation must leave the profile intact');
assert.equal(restart.records.size, 3);
restart.confirm();
restart.confirm();
await settle();
assert.deepEqual(restart.events, [
  'close-settings', 'pause', 'save', 'save-peers',
  EXPERIMENT_TUTORIAL_HANDOFF_STORAGE_KEY, APP_EXPERIENCE_PROFILE_STORAGE_KEY, 'first-run',
]);
assert.deepEqual([...restart.records], [['general-settings', 'kept']]);

const failedSave = createRestart();
failedSave.behavior.save = async () => false;
failedSave.confirm();
await settle();
assert.deepEqual(failedSave.events, ['close-settings', 'pause', 'save', 'resume', 'error']);
assert.equal(failedSave.records.size, 3);
failedSave.behavior.save = async () => true;
failedSave.retry();
await settle();
assert.equal(failedSave.events.at(-1), 'first-run');

const failedDesktop = createRestart();
failedDesktop.behavior.desktop = 'error';
failedDesktop.confirm();
await settle();
assert.deepEqual(failedDesktop.events.slice(-3), ['save-peers', 'resume', 'error']);
assert.equal(failedDesktop.records.size, 3);

const failedStorage = createRestart();
failedStorage.behavior.failHandoff = true;
failedStorage.confirm();
await settle();
assert.deepEqual(failedStorage.events.slice(-3), ['release-peers:false', 'resume', 'error']);
assert.equal(failedStorage.records.size, 3);
