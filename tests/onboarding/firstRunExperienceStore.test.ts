import assert from 'node:assert/strict';
import { createCommittedFirstRunProfile } from '../../src/features/onboarding/firstRunExperienceModel.ts';
import { commitFirstRunExperienceProfile } from '../../src/features/onboarding/firstRunExperienceStore.ts';
import {
  APP_EXPERIENCE_PROFILE_STORAGE_KEY,
  loadAppExperienceProfile,
  type ExperienceProfileStorage,
} from '../../src/features/learning/experimentLearningStore.ts';

class MemoryStorage implements ExperienceProfileStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const profile = createCommittedFirstRunProfile({
  draft: { language: 'en', heatCapacity: 'known' },
});
const storage = new MemoryStorage();
assert.equal(commitFirstRunExperienceProfile(profile, storage).ok, true);
assert.deepEqual(loadAppExperienceProfile(storage), {
  status: 'loaded',
  profile,
  persisted: true,
});
assert.ok(storage.getItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY));

const failingStorage = new MemoryStorage();
failingStorage.setItem = () => { throw new Error('storage blocked'); };
const failed = commitFirstRunExperienceProfile(profile, failingStorage);
assert.equal(failed.ok, false);
if (failed.ok === false) assert.match(failed.error.message, /storage blocked/);

console.log('firstRunExperienceStore tests passed');
