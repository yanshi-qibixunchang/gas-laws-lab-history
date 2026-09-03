import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';

export const APP_EXPERIENCE_PROFILE_SCHEMA_VERSION = 1 as const;

export type ExperimentLearningId = 'heatCapacity' | 'pistonOscillation';
export type ExperienceNeedState = 'known' | 'needs-guidance' | null;
export type ExperimentLearningMilestone = 'demo' | 'guide' | 'unlocked';

export const EXPERIMENT_LEARNING_ORDER: readonly ExperimentLearningId[] = [
  'heatCapacity',
  'pistonOscillation',
];

export interface AppExperienceProfile {
  schemaVersion: typeof APP_EXPERIENCE_PROFILE_SCHEMA_VERSION;
  firstRunCompleted: boolean;
  acceptedLegalVersion: string | null;
  committedLanguage: WorkbenchLanguagePreference | null;
  needs: {
    workspaceUi: ExperienceNeedState;
    heatCapacity: ExperienceNeedState;
    pistonOscillation: ExperienceNeedState;
  };
  learning: Record<ExperimentLearningId, ExperimentLearningMilestone>;
  activeTutorialExperiment: ExperimentLearningId | null;
}

export type ExperienceProfileParseResult =
  | { ok: true; value: AppExperienceProfile }
  | { ok: false; reason: string };

const EXPERIENCE_NEED_STATES = new Set<ExperienceNeedState>([
  'known',
  'needs-guidance',
  null,
]);
const LEARNING_MILESTONES = new Set<ExperimentLearningMilestone>([
  'demo',
  'guide',
  'unlocked',
]);
const LANGUAGE_PREFERENCES = new Set<WorkbenchLanguagePreference>([
  'zh-CN',
  'zh-TW',
  'en',
]);
const EXPERIMENT_IDS = new Set<ExperimentLearningId>([
  'heatCapacity',
  'pistonOscillation',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]) => {
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  return actual.length === normalizedExpected.length && actual.every((key, index) => (
    key === normalizedExpected[index]
  ));
};

export const createDefaultAppExperienceProfile = (
  committedLanguage: WorkbenchLanguagePreference | null = null,
): AppExperienceProfile => ({
  schemaVersion: APP_EXPERIENCE_PROFILE_SCHEMA_VERSION,
  firstRunCompleted: false,
  acceptedLegalVersion: null,
  committedLanguage,
  needs: {
    workspaceUi: null,
    heatCapacity: null,
    pistonOscillation: null,
  },
  learning: {
    heatCapacity: 'demo',
    pistonOscillation: 'demo',
  },
  activeTutorialExperiment: null,
});

/**
 * Users upgrading from versions without an experience record stay fully
 * unlocked. This in-memory compatibility fallback is never persisted on read.
 */
export const createLegacyUnlockedExperienceProfile = (
  committedLanguage: WorkbenchLanguagePreference | null = null,
): AppExperienceProfile => ({
  ...createDefaultAppExperienceProfile(committedLanguage),
  needs: {
    workspaceUi: 'known',
    heatCapacity: 'known',
    pistonOscillation: 'known',
  },
  learning: {
    heatCapacity: 'unlocked',
    pistonOscillation: 'unlocked',
  },
});

export const parseAppExperienceProfile = (value: unknown): ExperienceProfileParseResult => {
  if (!isRecord(value)) return { ok: false, reason: 'Experience profile must be an object.' };
  if (!hasExactKeys(value, [
    'schemaVersion',
    'firstRunCompleted',
    'acceptedLegalVersion',
    'committedLanguage',
    'needs',
    'learning',
    'activeTutorialExperiment',
  ])) {
    return { ok: false, reason: 'Experience profile fields do not match schema version 1.' };
  }
  if (value.schemaVersion !== APP_EXPERIENCE_PROFILE_SCHEMA_VERSION) {
    return { ok: false, reason: 'Unsupported experience profile schema version.' };
  }
  if (typeof value.firstRunCompleted !== 'boolean') {
    return { ok: false, reason: 'firstRunCompleted must be boolean.' };
  }
  if (!(value.acceptedLegalVersion === null || typeof value.acceptedLegalVersion === 'string')) {
    return { ok: false, reason: 'acceptedLegalVersion must be text or null.' };
  }
  if (!(value.committedLanguage === null || LANGUAGE_PREFERENCES.has(value.committedLanguage as WorkbenchLanguagePreference))) {
    return { ok: false, reason: 'committedLanguage is invalid.' };
  }
  if (!isRecord(value.needs) || !hasExactKeys(value.needs, [
    'workspaceUi',
    'heatCapacity',
    'pistonOscillation',
  ])) {
    return { ok: false, reason: 'needs does not match schema version 1.' };
  }
  if (
    !EXPERIENCE_NEED_STATES.has(value.needs.workspaceUi as ExperienceNeedState) ||
    !EXPERIENCE_NEED_STATES.has(value.needs.heatCapacity as ExperienceNeedState) ||
    !EXPERIENCE_NEED_STATES.has(value.needs.pistonOscillation as ExperienceNeedState)
  ) {
    return { ok: false, reason: 'One or more learning needs are invalid.' };
  }
  if (!isRecord(value.learning) || !hasExactKeys(value.learning, [
    'heatCapacity',
    'pistonOscillation',
  ])) {
    return { ok: false, reason: 'learning does not match schema version 1.' };
  }
  if (
    !LEARNING_MILESTONES.has(value.learning.heatCapacity as ExperimentLearningMilestone) ||
    !LEARNING_MILESTONES.has(value.learning.pistonOscillation as ExperimentLearningMilestone)
  ) {
    return { ok: false, reason: 'One or more learning milestones are invalid.' };
  }
  if (!(value.activeTutorialExperiment === null || EXPERIMENT_IDS.has(value.activeTutorialExperiment as ExperimentLearningId))) {
    return { ok: false, reason: 'activeTutorialExperiment is invalid.' };
  }
  if (
    value.activeTutorialExperiment !== null &&
    value.learning[value.activeTutorialExperiment as ExperimentLearningId] === 'unlocked'
  ) {
    return { ok: false, reason: 'An unlocked experiment cannot remain the active tutorial.' };
  }

  return { ok: true, value: value as unknown as AppExperienceProfile };
};

export const getNextPendingTutorialExperiment = (
  profile: AppExperienceProfile,
  afterExperiment: ExperimentLearningId | null = null,
): ExperimentLearningId | null => {
  const afterIndex = afterExperiment === null
    ? -1
    : EXPERIMENT_LEARNING_ORDER.indexOf(afterExperiment);
  const orderedCandidates = [
    ...EXPERIMENT_LEARNING_ORDER.slice(afterIndex + 1),
    ...EXPERIMENT_LEARNING_ORDER.slice(0, afterIndex + 1),
  ];
  return orderedCandidates.find((experiment) => (
    profile.needs[experiment] === 'needs-guidance' &&
    profile.learning[experiment] !== 'unlocked'
  )) ?? null;
};

export const startExperimentTutorialProfile = (
  current: AppExperienceProfile,
  experiment: ExperimentLearningId,
): AppExperienceProfile => ({
  ...current,
  needs: {
    ...current.needs,
    [experiment]: 'needs-guidance',
  },
  learning: {
    ...current.learning,
    [experiment]: 'demo',
  },
  activeTutorialExperiment: experiment,
});

export const unlockExperimentGuideProfile = (
  current: AppExperienceProfile,
  experiment: ExperimentLearningId,
): AppExperienceProfile | null => {
  if (
    current.activeTutorialExperiment !== experiment ||
    current.learning[experiment] !== 'demo'
  ) return null;
  return {
    ...current,
    learning: {
      ...current.learning,
      [experiment]: 'guide',
    },
  };
};

export const completeExperimentTutorialProfile = (
  current: AppExperienceProfile,
  experiment: ExperimentLearningId,
): AppExperienceProfile | null => {
  if (
    current.activeTutorialExperiment !== experiment ||
    current.learning[experiment] !== 'guide'
  ) return null;
  return skipExperimentTutorialProfile(current, experiment);
};

export const skipExperimentTutorialProfile = (
  current: AppExperienceProfile,
  experiment: ExperimentLearningId,
): AppExperienceProfile | null => {
  if (
    current.activeTutorialExperiment !== experiment ||
    current.learning[experiment] === 'unlocked'
  ) return null;
  const completedProfile: AppExperienceProfile = {
    ...current,
    needs: {
      ...current.needs,
      [experiment]: 'known',
    },
    learning: {
      ...current.learning,
      [experiment]: 'unlocked',
    },
    activeTutorialExperiment: null,
  };
  return {
    ...completedProfile,
    activeTutorialExperiment: getNextPendingTutorialExperiment(completedProfile, experiment),
  };
};

export const isExperimentTutorialActive = (
  profile: AppExperienceProfile,
  experiment: ExperimentLearningId | null = profile.activeTutorialExperiment,
) => (
  experiment !== null &&
  profile.activeTutorialExperiment === experiment &&
  profile.learning[experiment] !== 'unlocked'
);
