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
  completeExperimentTutorialProfile,
  getPendingExperimentTutorialForNewFile,
  parseAppExperienceProfile,
  startExperimentTutorialProfile,
  unlockExperimentGuideProfile,
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
  draft: { language: 'zh-TW', heatCapacity: 'known', pistonOscillation: 'known' },
});
assert.equal(familiarProfile.firstRunCompleted, true);
assert.equal(familiarProfile.committedLanguage, 'zh-TW');
assert.equal(familiarProfile.needs.heatCapacity, 'known');
assert.equal(familiarProfile.learning.heatCapacity, 'unlocked');
assert.equal(familiarProfile.learning.pistonOscillation, 'unlocked');
assert.equal(familiarProfile.activeTutorialExperiment, null);
assert.equal(familiarProfile.workspaceTourStep, 'not-needed');

const guidedProfile = createCommittedFirstRunProfile({
  draft: {
    language: 'zh-CN',
    heatCapacity: 'needs-guidance',
    pistonOscillation: 'needs-guidance',
  },
});
assert.equal(guidedProfile.needs.heatCapacity, 'needs-guidance');
assert.equal(guidedProfile.learning.heatCapacity, 'demo');
assert.equal(guidedProfile.activeTutorialExperiment, null);
assert.equal(guidedProfile.workspaceTourStep, 'top');
assert.equal(guidedProfile.learning.pistonOscillation, 'demo');
assert.throws(() => createCommittedFirstRunProfile({
  draft: { language: 'zh-CN', heatCapacity: null, pistonOscillation: 'known' },
}), /must be answered/);

const pistonOnlyGuidedProfile = createCommittedFirstRunProfile({
  draft: {
    language: 'zh-CN',
    heatCapacity: 'known',
    pistonOscillation: 'needs-guidance',
  },
});
assert.equal(pistonOnlyGuidedProfile.activeTutorialExperiment, null);
assert.equal(pistonOnlyGuidedProfile.workspaceTourStep, 'not-needed');
const heatOnlyGuidedProfile = createCommittedFirstRunProfile({
  draft: { language: 'zh-CN', heatCapacity: 'needs-guidance', pistonOscillation: 'known' },
});
assert.equal(heatOnlyGuidedProfile.activeTutorialExperiment, null);
assert.equal(heatOnlyGuidedProfile.workspaceTourStep, 'not-needed');
assert.equal(getPendingExperimentTutorialForNewFile(heatOnlyGuidedProfile, 'heatCapacity'), 'heatCapacity');
assert.equal(getPendingExperimentTutorialForNewFile(heatOnlyGuidedProfile, 'heatCapacityPistonOscillation'), null);
assert.equal(getPendingExperimentTutorialForNewFile(pistonOnlyGuidedProfile, 'heatCapacity'), null);
assert.equal(getPendingExperimentTutorialForNewFile(pistonOnlyGuidedProfile, 'heatCapacityPistonOscillation'), 'pistonOscillation');
assert.equal(getPendingExperimentTutorialForNewFile(guidedProfile, 'standard'), null);

const finishedTour = { ...guidedProfile, workspaceTourStep: 'finished' as const };
const selectedPiston = startExperimentTutorialProfile(finishedTour, 'pistonOscillation', 'file-creation');
assert.deepEqual(parseAppExperienceProfile(selectedPiston), { ok: true, value: selectedPiston });
const pistonGuide = unlockExperimentGuideProfile(selectedPiston, 'pistonOscillation');
assert.ok(pistonGuide);
const completedPiston = completeExperimentTutorialProfile(pistonGuide, 'pistonOscillation');
assert.ok(completedPiston);
assert.equal(completedPiston.activeTutorialExperiment, null);
assert.equal(completedPiston.tutorialStartSource, undefined);
assert.equal(completedPiston.learning.pistonOscillation, 'unlocked');
assert.equal(completedPiston.learning.heatCapacity, 'demo');
assert.equal(getPendingExperimentTutorialForNewFile(completedPiston, 'heatCapacity'), 'heatCapacity');
assert.equal(getPendingExperimentTutorialForNewFile(completedPiston, 'heatCapacityPistonOscillation'), null);

const oldProfile = createLegacyUnlockedExperienceProfile();
assert.deepEqual(parseAppExperienceProfile(oldProfile), { ok: true, value: oldProfile });
assert.equal(oldProfile.workspaceTourStep, undefined);

console.log('firstRunExperienceModel tests passed');
