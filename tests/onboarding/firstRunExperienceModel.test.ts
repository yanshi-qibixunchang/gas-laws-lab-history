import assert from 'node:assert/strict';
import {
  acceptCurrentLegalVersion,
  createCommittedFirstRunProfile,
  matchWorkbenchLanguage,
  resolveFirstRunEntryMode,
  resolveInitialFirstRunLanguage,
} from '../../src/features/onboarding/firstRunExperienceModel.ts';
import {
  CURRENT_WORKBENCH_LEGAL_VERSION,
  WORKBENCH_LEGAL_CONTENT_REVISION,
} from '../../src/features/onboarding/workbenchLegalVersion.ts';
import {
  createDefaultAppExperienceProfile,
  createLegacyUnlockedExperienceProfile,
} from '../../src/features/learning/experimentLearningModel.ts';
import type { ExperienceProfileLoadResult } from '../../src/features/learning/experimentLearningStore.ts';

const missing: ExperienceProfileLoadResult = {
  status: 'missing',
  profile: createLegacyUnlockedExperienceProfile(),
  persisted: false,
};
assert.match(CURRENT_WORKBENCH_LEGAL_VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/);
assert.match(WORKBENCH_LEGAL_CONTENT_REVISION, /workbench-build-notice/);
assert.equal(resolveFirstRunEntryMode(missing), 'full');

const incomplete = createDefaultAppExperienceProfile('zh-CN');
assert.equal(resolveFirstRunEntryMode({ status: 'loaded', profile: incomplete, persisted: true }), 'full');

const completedWithoutCurrentLegal = {
  ...createLegacyUnlockedExperienceProfile('zh-CN'),
  firstRunCompleted: true,
  acceptedLegalVersion: 'old-legal',
};
assert.equal(resolveFirstRunEntryMode({
  status: 'loaded',
  profile: completedWithoutCurrentLegal,
  persisted: true,
}), 'legal-only');

const current = acceptCurrentLegalVersion(completedWithoutCurrentLegal);
assert.equal(current.acceptedLegalVersion, CURRENT_WORKBENCH_LEGAL_VERSION);
assert.equal(resolveFirstRunEntryMode({ status: 'loaded', profile: current, persisted: true }), 'workbench');

assert.equal(matchWorkbenchLanguage(['zh-Hant-HK', 'en-US']), 'zh-TW');
assert.equal(matchWorkbenchLanguage(['zh-CN']), 'zh-CN');
assert.equal(matchWorkbenchLanguage(['en-GB']), 'en');
assert.equal(matchWorkbenchLanguage(['fr-FR']), 'zh-CN');
assert.equal(resolveInitialFirstRunLanguage({
  persistedLanguage: 'en',
  browserLanguages: ['zh-CN'],
}), 'en');

const familiarProfile = createCommittedFirstRunProfile({
  draft: { language: 'zh-TW', heatCapacity: 'known' },
});
assert.equal(familiarProfile.firstRunCompleted, true);
assert.equal(familiarProfile.committedLanguage, 'zh-TW');
assert.equal(familiarProfile.needs.heatCapacity, 'known');
assert.equal(familiarProfile.learning.heatCapacity, 'unlocked');
assert.equal(familiarProfile.activeTutorialExperiment, null);

const guidedProfile = createCommittedFirstRunProfile({
  draft: { language: 'zh-CN', heatCapacity: 'needs-guidance' },
});
assert.equal(guidedProfile.needs.heatCapacity, 'needs-guidance');
assert.equal(guidedProfile.learning.heatCapacity, 'demo');
assert.equal(guidedProfile.activeTutorialExperiment, 'heatCapacity');
assert.throws(() => createCommittedFirstRunProfile({
  draft: { language: 'zh-CN', heatCapacity: null },
}), /must be answered/);

console.log('firstRunExperienceModel tests passed');
