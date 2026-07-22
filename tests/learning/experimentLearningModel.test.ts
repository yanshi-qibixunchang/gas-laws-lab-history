import assert from 'node:assert/strict';
import {
  completeHeatCapacityTutorialProfile,
  createDefaultAppExperienceProfile,
  createLegacyUnlockedExperienceProfile,
  parseAppExperienceProfile,
  startHeatCapacityTutorialProfile,
  unlockHeatCapacityGuideProfile,
} from '../../src/features/learning/experimentLearningModel.ts';
import {
  APP_EXPERIENCE_PROFILE_STORAGE_KEY,
  loadAppExperienceProfile,
  persistAppExperienceProfile,
  type ExperienceProfileStorage,
} from '../../src/features/learning/experimentLearningStore.ts';
import {
  evaluateWorkbenchTutorialAccess,
  isHeatCapacityTutorialModeUnlocked,
  type WorkbenchTutorialAccessAction,
} from '../../src/features/learning/workbenchTutorialAccessPolicy.ts';
import {
  clearHeatCapacityTutorialHandoff,
  getHeatCapacityTutorialMilestoneLogs,
  getHeatCapacityTutorialResumeMode,
  loadHeatCapacityTutorialHandoff,
  persistHeatCapacityTutorialHandoff,
} from '../../src/features/learning/workbenchTutorialCoordinator.ts';

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

const resetProfile = startHeatCapacityTutorialProfile(createLegacyUnlockedExperienceProfile('zh-CN'));
assert.equal(resetProfile.firstRunCompleted, false);
assert.equal(resetProfile.activeTutorialExperiment, 'heatCapacity');
assert.equal(resetProfile.learning.heatCapacity, 'demo');
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
  'tutorial-mode',
];
allowedActions.forEach((action) => {
  assert.deepEqual(evaluateWorkbenchTutorialAccess(resetProfile, action), {
    allowed: true,
    reason: null,
  });
});
assert.equal(isHeatCapacityTutorialModeUnlocked('demo', 'demo'), true);
assert.equal(isHeatCapacityTutorialModeUnlocked('demo', 'guide'), false);
assert.equal(isHeatCapacityTutorialModeUnlocked('guide', 'guide'), true);
assert.equal(isHeatCapacityTutorialModeUnlocked('guide', 'free'), false);

const guideProfile = unlockHeatCapacityGuideProfile(resetProfile);
assert.ok(guideProfile);
assert.equal(guideProfile.learning.heatCapacity, 'guide');
assert.equal(getHeatCapacityTutorialResumeMode(guideProfile.learning.heatCapacity), 'guide');
assert.deepEqual(getHeatCapacityTutorialMilestoneLogs('guide').map((log) => log.id), [
  'demo-started',
  'guide-unlocked',
]);

const completedProfile = completeHeatCapacityTutorialProfile(guideProfile);
assert.ok(completedProfile);
assert.equal(completedProfile.learning.heatCapacity, 'unlocked');
assert.equal(completedProfile.needs.heatCapacity, 'known');
assert.equal(completedProfile.activeTutorialExperiment, null);
assert.equal(getHeatCapacityTutorialResumeMode('unlocked'), null);

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
assert.equal(loadHeatCapacityTutorialHandoff(handoffStorage).status, 'missing');
assert.equal(persistHeatCapacityTutorialHandoff('heatCapacity-target', handoffStorage, 9_000).ok, true);
assert.deepEqual(loadHeatCapacityTutorialHandoff(handoffStorage), {
  status: 'loaded',
  marker: {
    schemaVersion: 1,
    experiment: 'heatCapacity',
    status: 'profile-unlocked-pending-file',
    targetFileId: 'heatCapacity-target',
    createdAtMs: 9_000,
  },
});
assert.equal(clearHeatCapacityTutorialHandoff(handoffStorage).ok, true);
assert.equal(loadHeatCapacityTutorialHandoff(handoffStorage).status, 'missing');

const failedHandoffWrite = persistHeatCapacityTutorialHandoff('heatCapacity-target', {
  setItem: () => { throw new Error('handoff write denied'); },
});
assert.equal(failedHandoffWrite.ok, false);
const failedHandoffClear = clearHeatCapacityTutorialHandoff({
  removeItem: () => { throw new Error('handoff clear denied'); },
});
assert.equal(failedHandoffClear.ok, false);

console.log('experimentLearningModel tests passed');
