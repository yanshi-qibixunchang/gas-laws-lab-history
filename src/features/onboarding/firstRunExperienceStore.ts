import type { AppExperienceProfile } from '../learning/experimentLearningModel.ts';
import {
  persistAppExperienceProfile,
  type ExperienceProfileStorage,
  type ExperienceProfileWriteResult,
} from '../learning/experimentLearningStore.ts';

/**
 * The single experience-profile write is the authority for first-run commit.
 * General settings may mirror the committed language afterward, but cannot
 * independently mark onboarding or legal consent as complete.
 */
export const commitFirstRunExperienceProfile = (
  profile: AppExperienceProfile,
  storage?: ExperienceProfileStorage | null,
): ExperienceProfileWriteResult => (
  storage === undefined
    ? persistAppExperienceProfile(profile)
    : persistAppExperienceProfile(profile, storage)
);
