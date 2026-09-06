import type { AppExperienceProfile } from '../learning/experimentLearningModel.ts';
import { isExperimentTutorialActive } from '../learning/experimentLearningModel.ts';
import { evaluateWorkbenchTutorialAccess, type WorkbenchTutorialAccessAction } from '../learning/workbenchTutorialAccessPolicy.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
import type { persistAppExperienceProfile as persistProfile } from '../learning/experimentLearningStore.ts';
export type WorkbenchTutorialProfilePorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'experienceProfileRef' | 'experienceProfilePersistedRef' | 'tutorialActiveRef' | 'setExperienceProfile' | 'experimentLearningChannelRef' | 'setTutorialOperationError' | 'setTutorialBlockedNoticeOpen'> & {
  persistAppExperienceProfile: typeof persistProfile;
  setOpenTopMenu: (menu: null) => void;
};
export const createWorkbenchTutorialProfileActions = ({ experienceProfileRef, experienceProfilePersistedRef, tutorialActiveRef, setExperienceProfile, experimentLearningChannelRef, setTutorialOperationError, setTutorialBlockedNoticeOpen, persistAppExperienceProfile, setOpenTopMenu }: WorkbenchTutorialProfilePorts) => {
  const guardWorkbenchTutorialAction = (action: WorkbenchTutorialAccessAction) => {
    const decision = evaluateWorkbenchTutorialAccess(experienceProfileRef.current, action);
    if (decision.allowed) return true;
    setOpenTopMenu(null);
    setTutorialBlockedNoticeOpen(true);
    return false;
  };
  const commitExperienceProfile = (nextProfile: AppExperienceProfile) => {
    const result = persistAppExperienceProfile(nextProfile);
    if (result.ok === false) {
      setTutorialOperationError({
        message: result.error.message,
        retry: null,
      });
      return false;
    }
    experienceProfilePersistedRef.current = true;
    experienceProfileRef.current = result.profile;
    tutorialActiveRef.current = isExperimentTutorialActive(result.profile);
    setExperienceProfile(result.profile);
    experimentLearningChannelRef.current?.publish(result.profile);
    return true;
  };
  return { guardWorkbenchTutorialAction, commitExperienceProfile };
};
