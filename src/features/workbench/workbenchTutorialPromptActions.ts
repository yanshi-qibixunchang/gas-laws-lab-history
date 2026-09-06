import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
export type WorkbenchTutorialPromptActionPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'tutorialOperationError' | 'setTutorialOperationError' | 'setTutorialBlockedNoticeOpen' | 'tutorialOwnershipClaimRef'> & { window: Window };
export const createWorkbenchTutorialPromptActions = ({ tutorialOperationError, setTutorialOperationError, setTutorialBlockedNoticeOpen, tutorialOwnershipClaimRef, window }: WorkbenchTutorialPromptActionPorts) => {
const exitAfterTutorialFailure = () => {
          const tutorialExit = window.hardSphereLabTutorial?.exitApplication?.();
          if (tutorialExit) return;
          const desktopClose = window.hardSphereLabWindow?.close?.();
          if (!desktopClose) window.close();
        };
const retryTutorialOperation = () => {
          const retry = tutorialOperationError?.retry;
          setTutorialOperationError(null);
          if (retry) retry();
          else window.location.reload();
        };
const dismissTutorialBlockedNotice = () => setTutorialBlockedNoticeOpen(false);
const recheckTutorialOwnership = () => {
          if (window.hardSphereLabWindow) {
            window.location.reload();
            return;
          }
          tutorialOwnershipClaimRef.current(true);
        };
return { exitAfterTutorialFailure, retryTutorialOperation, dismissTutorialBlockedNotice, recheckTutorialOwnership };
};
