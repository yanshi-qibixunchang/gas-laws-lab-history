import assert from 'node:assert/strict';
import {
  acceptCurrentLegalVersion,
  createCommittedFirstRunProfile,
  resolveFirstRunEntryMode,
} from '../../src/features/onboarding/firstRunExperienceModel.ts';
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
  draft: { language: 'en', heatCapacity: 'known', pistonOscillation: 'known' },
});
const storage = new MemoryStorage();
assert.equal(commitFirstRunExperienceProfile(profile, storage).ok, true);
assert.deepEqual(loadAppExperienceProfile(storage), {
  status: 'loaded',
  profile,
  persisted: true,
});
assert.ok(storage.getItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY));
const restarted = loadAppExperienceProfile(storage);
assert.equal(resolveFirstRunEntryMode(restarted), 'workbench', 'a normal restart should keep the completed first-run profile');

const priorLegalProfile = {
  ...profile,
  acceptedLegalVersion: 'previous-legal-version',
};
assert.equal(commitFirstRunExperienceProfile(priorLegalProfile, storage).ok, true);
const afterLegalRevision = loadAppExperienceProfile(storage);
assert.equal(resolveFirstRunEntryMode(afterLegalRevision), 'legal-only', 'a legal revision should request consent without replaying full onboarding');
assert.equal(afterLegalRevision.profile.committedLanguage, profile.committedLanguage);
assert.deepEqual(afterLegalRevision.profile.learning, profile.learning);
assert.deepEqual(afterLegalRevision.profile.needs, profile.needs);

const renewedProfile = acceptCurrentLegalVersion(afterLegalRevision.profile);
assert.equal(commitFirstRunExperienceProfile(renewedProfile, storage).ok, true);
const afterRenewalRestart = loadAppExperienceProfile(storage);
assert.equal(resolveFirstRunEntryMode(afterRenewalRestart), 'workbench');
assert.equal(afterRenewalRestart.profile.acceptedLegalVersion, renewedProfile.acceptedLegalVersion);
assert.equal(afterRenewalRestart.profile.committedLanguage, profile.committedLanguage);
assert.deepEqual(afterRenewalRestart.profile.learning, profile.learning);
assert.deepEqual(afterRenewalRestart.profile.needs, profile.needs);

const failingStorage = new MemoryStorage();
failingStorage.setItem = () => { throw new Error('storage blocked'); };
const failed = commitFirstRunExperienceProfile(profile, failingStorage);
assert.equal(failed.ok, false);
if (failed.ok === false) assert.match(failed.error.message, /storage blocked/);

console.log('firstRunExperienceStore tests passed');
