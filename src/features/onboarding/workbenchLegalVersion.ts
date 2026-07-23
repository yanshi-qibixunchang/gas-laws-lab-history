import type { AppExperienceProfile } from '../learning/experimentLearningModel.ts';

/**
 * This is intentionally independent from the app package version. Increment it
 * only when the mandatory legal notice changes materially.
 */
export const CURRENT_WORKBENCH_LEGAL_VERSION = '2026-07-23.1';

/**
 * Release checks use this companion marker to make legal-copy review explicit.
 */
export const WORKBENCH_LEGAL_CONTENT_REVISION = 'workbench-build-notice-2026-07-23';

export const doesWorkbenchLegalConsentNeedRenewal = (
  profile: AppExperienceProfile,
  legalVersion = CURRENT_WORKBENCH_LEGAL_VERSION,
) => profile.acceptedLegalVersion !== legalVersion;
