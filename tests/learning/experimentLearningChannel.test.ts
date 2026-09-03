import assert from 'node:assert/strict';
import {
  claimExperimentTutorialOwnership,
  EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY,
  parseExperimentLearningChannelMessage,
  releaseExperimentTutorialOwnership,
  takeOverExperimentTutorialOwnership,
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
assert.equal(claimExperimentTutorialOwnership('window-a', 'heatCapacity', storage, 1_000), true);
assert.equal(claimExperimentTutorialOwnership('window-b', 'pistonOscillation', storage, 2_000), false);
assert.equal(takeOverExperimentTutorialOwnership('window-b', 'pistonOscillation', storage, 2_500), true);
assert.equal(claimExperimentTutorialOwnership('window-a', 'heatCapacity', storage, 3_000), false, 'the previous window yields after an explicit takeover');
assert.equal(claimExperimentTutorialOwnership('window-b', 'pistonOscillation', storage, 3_500), true);
assert.equal(claimExperimentTutorialOwnership('window-b', 'pistonOscillation', storage, 20_000), true, 'expired ownership may be reclaimed');
assert.equal(releaseExperimentTutorialOwnership('window-a', storage), false);
assert.equal(releaseExperimentTutorialOwnership('window-b', storage), true);
assert.equal(storage.getItem(EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY), null);

const staleWriteStorage = {
  getItem: () => JSON.stringify({
    instanceId: 'window-a',
    experiment: 'heatCapacity',
    updatedAtMs: 1_000,
  }),
  setItem: () => undefined,
};
assert.equal(
  takeOverExperimentTutorialOwnership('window-a', 'pistonOscillation', staleWriteStorage, 2_000),
  false,
  'a transfer must verify both the owner and the next experiment',
);

console.log('experimentLearningChannel tests passed');
