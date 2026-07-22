import assert from 'node:assert/strict';
import {
  claimHeatCapacityTutorialOwnership,
  EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY,
  parseExperimentLearningChannelMessage,
  releaseHeatCapacityTutorialOwnership,
} from '../../src/features/learning/experimentLearningChannel.ts';
import { createLegacyUnlockedExperienceProfile } from '../../src/features/learning/experimentLearningModel.ts';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const profile = createLegacyUnlockedExperienceProfile();
assert.ok(parseExperimentLearningChannelMessage({
  type: 'profile-updated',
  sourceId: 'window-a',
  profile,
}));
assert.equal(parseExperimentLearningChannelMessage({ type: 'profile-updated' }), null);

const storage = new MemoryStorage();
assert.equal(claimHeatCapacityTutorialOwnership('window-a', storage, 1_000), true);
assert.equal(claimHeatCapacityTutorialOwnership('window-b', storage, 2_000), false);
assert.equal(claimHeatCapacityTutorialOwnership('window-b', storage, 20_000), true, 'expired ownership may be reclaimed');
assert.equal(releaseHeatCapacityTutorialOwnership('window-a', storage), false);
assert.equal(releaseHeatCapacityTutorialOwnership('window-b', storage), true);
assert.equal(storage.getItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY), null);

console.log('experimentLearningChannel tests passed');
