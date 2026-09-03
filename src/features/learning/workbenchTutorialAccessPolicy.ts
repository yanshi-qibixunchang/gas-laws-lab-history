import {
  isExperimentTutorialActive,
  type AppExperienceProfile,
  type ExperimentLearningMilestone,
} from './experimentLearningModel.ts';

export type WorkbenchTutorialAccessAction =
  | 'create-file'
  | 'open-file'
  | 'close-file'
  | 'rename-file'
  | 'delete-file'
  | 'export-file'
  | 'save-as'
  | 'new-window'
  | 'undo'
  | 'redo'
  | 'open-parameter-window'
  | 'open-results-window'
  | 'open-data-window'
  | 'open-calculation-window'
  | 'reset-learning'
  | 'exit-tutorial'
  | 'replay-product-intro'
  | 'reselect-learning-needs'
  | 'general-settings'
  | 'help'
  | 'about'
  | 'legal'
  | 'change-language'
  | 'change-theme'
  | 'change-performance'
  | 'change-audio'
  | 'minimize-window'
  | 'maximize-window'
  | 'exit-application'
  | 'tutorial-mode';

export interface WorkbenchTutorialAccessDecision {
  allowed: boolean;
  reason: 'tutorial-active' | null;
}

const ALLOWED_DURING_TUTORIAL = new Set<WorkbenchTutorialAccessAction>([
  'general-settings',
  'help',
  'about',
  'legal',
  'change-language',
  'change-theme',
  'change-performance',
  'change-audio',
  'minimize-window',
  'maximize-window',
  'exit-application',
  'exit-tutorial',
  'tutorial-mode',
]);

export const evaluateWorkbenchTutorialAccess = (
  profile: AppExperienceProfile,
  action: WorkbenchTutorialAccessAction,
): WorkbenchTutorialAccessDecision => {
  if (!isExperimentTutorialActive(profile) || ALLOWED_DURING_TUTORIAL.has(action)) {
    return { allowed: true, reason: null };
  }
  return { allowed: false, reason: 'tutorial-active' };
};

export const isExperimentTutorialModeUnlocked = (
  milestone: ExperimentLearningMilestone,
  mode: 'demo' | 'guide' | 'free',
) => (
  mode === 'demo' ||
  (mode === 'guide' && milestone !== 'demo') ||
  (mode === 'free' && milestone === 'unlocked')
);
