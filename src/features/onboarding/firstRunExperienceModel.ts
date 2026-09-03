import {
  createDefaultAppExperienceProfile,
  EXPERIMENT_LEARNING_ORDER,
  type AppExperienceProfile,
  type ExperienceNeedState,
} from '../learning/experimentLearningModel.ts';
import type { ExperienceProfileLoadResult } from '../learning/experimentLearningStore.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import {
  CURRENT_WORKBENCH_LEGAL_VERSION,
  doesWorkbenchLegalConsentNeedRenewal,
} from './workbenchLegalVersion.ts';

export type FirstRunEntryMode = 'full' | 'legal-only' | 'workbench';
export type ExperimentFamiliarityAnswer = Exclude<ExperienceNeedState, null>;

export interface FirstRunDraft {
  language: WorkbenchLanguagePreference;
  heatCapacity: ExperimentFamiliarityAnswer | null;
  pistonOscillation: ExperimentFamiliarityAnswer | null;
}

export const resolveFirstRunEntryMode = (
  loadResult: ExperienceProfileLoadResult,
  legalVersion = CURRENT_WORKBENCH_LEGAL_VERSION,
): FirstRunEntryMode => {
  if (loadResult.status !== 'loaded' || !loadResult.profile.firstRunCompleted) return 'full';
  return doesWorkbenchLegalConsentNeedRenewal(loadResult.profile, legalVersion)
    ? 'legal-only'
    : 'workbench';
};

const normalizeLocale = (locale: string) => locale.trim().replace(/_/g, '-').toLowerCase();

export const matchWorkbenchLanguage = (
  locales: readonly string[],
): WorkbenchLanguagePreference => {
  for (const candidate of locales) {
    const locale = normalizeLocale(candidate);
    if (!locale) continue;
    if (
      locale === 'zh-tw' ||
      locale === 'zh-hk' ||
      locale === 'zh-mo' ||
      locale.startsWith('zh-hant')
    ) return 'zh-TW';
    if (locale === 'zh' || locale.startsWith('zh-cn') || locale.startsWith('zh-sg') || locale.startsWith('zh-hans')) {
      return 'zh-CN';
    }
    if (locale === 'en' || locale.startsWith('en-')) return 'en';
  }
  return 'zh-CN';
};

export const resolveInitialFirstRunLanguage = ({
  persistedLanguage,
  browserLanguages,
}: {
  persistedLanguage: WorkbenchLanguagePreference | null;
  browserLanguages: readonly string[];
}) => persistedLanguage ?? matchWorkbenchLanguage(browserLanguages);

export const createCommittedFirstRunProfile = ({
  baseProfile,
  draft,
  legalVersion = CURRENT_WORKBENCH_LEGAL_VERSION,
}: {
  baseProfile?: AppExperienceProfile;
  draft: FirstRunDraft;
  legalVersion?: string;
}): AppExperienceProfile => {
  if (draft.heatCapacity === null || draft.pistonOscillation === null) {
    throw new Error('Every experiment familiarity question must be answered.');
  }
  const base = baseProfile ?? createDefaultAppExperienceProfile();
  const committedProfile: AppExperienceProfile = {
    ...base,
    firstRunCompleted: true,
    acceptedLegalVersion: legalVersion,
    committedLanguage: draft.language,
    needs: {
      ...base.needs,
      heatCapacity: draft.heatCapacity,
      pistonOscillation: draft.pistonOscillation,
    },
    learning: {
      ...base.learning,
      heatCapacity: draft.heatCapacity === 'needs-guidance' ? 'demo' : 'unlocked',
      pistonOscillation: draft.pistonOscillation === 'needs-guidance' ? 'demo' : 'unlocked',
    },
    activeTutorialExperiment: null,
  };
  return {
    ...committedProfile,
    activeTutorialExperiment: EXPERIMENT_LEARNING_ORDER.find((experiment) => (
      committedProfile.needs[experiment] === 'needs-guidance'
    )) ?? null,
  };
};

export const acceptCurrentLegalVersion = (
  profile: AppExperienceProfile,
  legalVersion = CURRENT_WORKBENCH_LEGAL_VERSION,
): AppExperienceProfile => ({
  ...profile,
  acceptedLegalVersion: legalVersion,
});
