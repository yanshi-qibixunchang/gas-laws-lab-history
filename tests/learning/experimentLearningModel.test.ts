import assert from 'node:assert/strict';
import {
  completeExperimentTutorialProfile,
  createDefaultAppExperienceProfile,
  createLegacyUnlockedExperienceProfile,
  parseAppExperienceProfile,
  skipExperimentTutorialProfile,
  startExperimentTutorialProfile,
  unlockExperimentGuideProfile,
} from '../../src/features/learning/experimentLearningModel.ts';
import {
  APP_EXPERIENCE_PROFILE_STORAGE_KEY,
  loadAppExperienceProfile,
  persistAppExperienceProfile,
  type ExperienceProfileStorage,
} from '../../src/features/learning/experimentLearningStore.ts';
import {
  evaluateWorkbenchTutorialAccess,
  isExperimentTutorialModeUnlocked,
  type WorkbenchTutorialAccessAction,
} from '../../src/features/learning/workbenchTutorialAccessPolicy.ts';
import {
  clearExperimentTutorialHandoff,
  getExperimentTutorialMilestoneLogs,
  getExperimentTutorialResumeMode,
  loadExperimentTutorialHandoff,
  persistExperimentTutorialHandoff,
  getExperimentTutorialFileId,
  getExperimentTutorialFileName,
  isExperimentTutorialFileId,
  shouldReconstructExperimentTutorial,
} from '../../src/features/learning/workbenchTutorialCoordinator.ts';
import {
  getAvailableExperimentLearningDefinitions,
} from '../../src/features/learning/experimentLearningRegistry.ts';

class MemoryStorage implements ExperienceProfileStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const missing = loadAppExperienceProfile(storage);
assert.equal(missing.status, 'missing');
assert.equal(missing.profile.learning.heatCapacity, 'unlocked');
assert.equal(storage.getItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY), null, 'compatibility fallback must not be persisted by reading');
assert.deepEqual(
  getAvailableExperimentLearningDefinitions().map((definition) => definition.id),
  ['heatCapacity', 'pistonOscillation'],
);
assert.equal(getExperimentTutorialFileId('pistonOscillation'), 'runtime:tutorial:piston-oscillation');
assert.equal(getExperimentTutorialFileName('pistonOscillation'), '活塞振动学习实验（临时）');
assert.equal(isExperimentTutorialFileId('runtime:tutorial:piston-oscillation'), true);

const resetProfile = startExperimentTutorialProfile(
  createLegacyUnlockedExperienceProfile('zh-CN'),
  'heatCapacity',
);
assert.equal(resetProfile.firstRunCompleted, false);
assert.equal(resetProfile.activeTutorialExperiment, 'heatCapacity');
assert.equal(resetProfile.learning.heatCapacity, 'demo');
assert.equal(shouldReconstructExperimentTutorial(resetProfile), true);
assert.equal(persistAppExperienceProfile(resetProfile, storage).ok, true);
assert.deepEqual(loadAppExperienceProfile(storage), {
  status: 'loaded',
  profile: resetProfile,
  persisted: true,
});

assert.equal(evaluateWorkbenchTutorialAccess(resetProfile, 'create-file').allowed, false);
assert.equal(evaluateWorkbenchTutorialAccess(resetProfile, 'general-settings').allowed, true);
const blockedActions: WorkbenchTutorialAccessAction[] = [
  'create-file',
  'open-file',
  'close-file',
  'rename-file',
  'delete-file',
  'export-file',
  'save-as',
  'new-window',
  'undo',
  'redo',
  'open-parameter-window',
  'open-results-window',
  'open-data-window',
  'open-calculation-window',
  'reset-learning',
  'replay-product-intro',
  'reselect-learning-needs',
];
blockedActions.forEach((action) => {
  assert.deepEqual(evaluateWorkbenchTutorialAccess(resetProfile, action), {
    allowed: false,
    reason: 'tutorial-active',
  });
});
const allowedActions: WorkbenchTutorialAccessAction[] = [
  'general-settings',
  'help',
  'about',
  'legal',
  'change-language',
  'change-theme',
  'change-performance',
  'change-audio',
  'minimize-window',
  'maximize-window',
  'exit-application',
  'exit-tutorial',
  'tutorial-mode',
];
allowedActions.forEach((action) => {
  assert.deepEqual(evaluateWorkbenchTutorialAccess(resetProfile, action), {
    allowed: true,
    reason: null,
  });
});
assert.equal(isExperimentTutorialModeUnlocked('demo', 'demo'), true);
assert.equal(isExperimentTutorialModeUnlocked('demo', 'guide'), false);
assert.equal(isExperimentTutorialModeUnlocked('guide', 'guide'), true);
assert.equal(isExperimentTutorialModeUnlocked('guide', 'free'), false);

const guideProfile = unlockExperimentGuideProfile(resetProfile, 'heatCapacity');
assert.ok(guideProfile);
assert.equal(guideProfile.learning.heatCapacity, 'guide');
assert.equal(getExperimentTutorialResumeMode(guideProfile.learning.heatCapacity), 'guide');
assert.deepEqual(getExperimentTutorialMilestoneLogs('guide').map((log) => log.id), [
  'demo-started',
  'guide-unlocked',
]);

const completedProfile = completeExperimentTutorialProfile(guideProfile, 'heatCapacity');
assert.ok(completedProfile);
assert.equal(completedProfile.learning.heatCapacity, 'unlocked');
assert.equal(completedProfile.needs.heatCapacity, 'known');
assert.equal(completedProfile.activeTutorialExperiment, null);
assert.equal(getExperimentTutorialResumeMode('unlocked'), null);

const skippedDemoProfile = skipExperimentTutorialProfile(resetProfile, 'heatCapacity');
assert.ok(skippedDemoProfile);
assert.equal(skippedDemoProfile.learning.heatCapacity, 'unlocked');
assert.equal(skippedDemoProfile.needs.heatCapacity, 'known');
assert.equal(skippedDemoProfile.activeTutorialExperiment, null);
assert.equal(skipExperimentTutorialProfile(completedProfile, 'heatCapacity'), null);

const sequentialProfile = {
  ...resetProfile,
  needs: {
    ...resetProfile.needs,
    pistonOscillation: 'needs-guidance' as const,
  },
  learning: {
    ...resetProfile.learning,
    pistonOscillation: 'demo' as const,
  },
};
const sequentialGuideProfile = unlockExperimentGuideProfile(sequentialProfile, 'heatCapacity');
assert.ok(sequentialGuideProfile);
const nextExperimentProfile = completeExperimentTutorialProfile(
  sequentialGuideProfile,
  'heatCapacity',
);
assert.ok(nextExperimentProfile);
assert.equal(nextExperimentProfile.activeTutorialExperiment, 'pistonOscillation');
assert.equal(shouldReconstructExperimentTutorial(nextExperimentProfile), true);
assert.deepEqual(evaluateWorkbenchTutorialAccess(nextExperimentProfile, 'open-file'), {
  allowed: false,
  reason: 'tutorial-active',
});
const skippedPistonProfile = skipExperimentTutorialProfile(
  nextExperimentProfile,
  'pistonOscillation',
);
assert.ok(skippedPistonProfile);
assert.equal(skippedPistonProfile.activeTutorialExperiment, null);
assert.equal(skippedPistonProfile.learning.pistonOscillation, 'unlocked');
assert.equal(shouldReconstructExperimentTutorial(skippedPistonProfile), false);

const extraField = { ...createDefaultAppExperienceProfile(), unexpected: true };
assert.equal(parseAppExperienceProfile(extraField).ok, false);
storage.setItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY, '{not json');
assert.equal(loadAppExperienceProfile(storage).status, 'invalid');

const writeFailureStorage = new MemoryStorage();
writeFailureStorage.setItem = () => { throw new Error('quota denied'); };
const failedProfileWrite = persistAppExperienceProfile(resetProfile, writeFailureStorage);
assert.equal(failedProfileWrite.ok, false);
if (failedProfileWrite.ok === false) assert.match(failedProfileWrite.error.message, /quota denied/);

const handoffStorage = new MemoryStorage();
assert.equal(loadExperimentTutorialHandoff(handoffStorage).status, 'missing');
assert.equal(persistExperimentTutorialHandoff('heatCapacity', 'heatCapacity-target', handoffStorage, 9_000).ok, true);
assert.deepEqual(loadExperimentTutorialHandoff(handoffStorage), {
  status: 'loaded',
  marker: {
    schemaVersion: 1,
    experiment: 'heatCapacity',
    status: 'profile-unlocked-pending-file',
    targetFileId: 'heatCapacity-target',
    createdAtMs: 9_000,
  },
});
assert.equal(clearExperimentTutorialHandoff(handoffStorage).ok, true);
assert.equal(loadExperimentTutorialHandoff(handoffStorage).status, 'missing');

assert.equal(
  persistExperimentTutorialHandoff('pistonOscillation', 'piston-target', handoffStorage, 10_000).ok,
  true,
);
assert.deepEqual(loadExperimentTutorialHandoff(handoffStorage), {
  status: 'loaded',
  marker: {
    schemaVersion: 1,
    experiment: 'pistonOscillation',
    status: 'profile-unlocked-pending-file',
    targetFileId: 'piston-target',
    createdAtMs: 10_000,
  },
});

const failedHandoffWrite = persistExperimentTutorialHandoff('pistonOscillation', 'piston-target', {
  setItem: () => { throw new Error('handoff write denied'); },
});
assert.equal(failedHandoffWrite.ok, false);
const failedHandoffClear = clearExperimentTutorialHandoff({
  removeItem: () => { throw new Error('handoff clear denied'); },
});
assert.equal(failedHandoffClear.ok, false);

console.log('experimentLearningModel tests passed');
