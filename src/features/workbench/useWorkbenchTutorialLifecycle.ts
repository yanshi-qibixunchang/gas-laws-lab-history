import { useEffect } from 'react';
import { isExperimentTutorialActive } from '../learning/experimentLearningModel.ts';
import { useWorkbenchTutorialOwnership } from './useWorkbenchTutorialOwnership.ts';
import type { WorkbenchTutorialOwnershipPorts } from './workbenchTutorialOwnership.ts';
import { scheduleWorkbenchTutorialHandoffRecovery, type WorkbenchTutorialHandoffRecoveryPorts } from './workbenchTutorialHandoffRecovery.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
export type WorkbenchTutorialLifecyclePorts = WorkbenchTutorialOwnershipPorts & WorkbenchTutorialHandoffRecoveryPorts & Pick<ReturnType<typeof useWorkbenchTutorialState>, 'experienceProfile' | 'tutorialNoticeKind' | 'tutorialNoticeKindRef' | 'tutorialActive'> & { firstRunRestartInProgress: { current: boolean } };
export const useWorkbenchTutorialLifecycle = (ports: WorkbenchTutorialLifecyclePorts) => {
  const { experienceProfileRef, experienceProfile, tutorialActiveRef, tutorialNoticeKindRef, tutorialNoticeKind, tutorialActive, firstRunRestartInProgress, window } = ports;
  useEffect(() => {
    experienceProfileRef.current = experienceProfile;
    tutorialActiveRef.current = isExperimentTutorialActive(experienceProfile);
  }, [experienceProfile]);
  useEffect(() => {
    tutorialNoticeKindRef.current = tutorialNoticeKind;
  }, [tutorialNoticeKind]);
  useEffect(() => {
    if (!tutorialActive || window.hardSphereLabWindow) return undefined;
    const confirmBrowserExit = (event: BeforeUnloadEvent) => {
      if (firstRunRestartInProgress.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', confirmBrowserExit);
    return () => window.removeEventListener('beforeunload', confirmBrowserExit);
  }, [firstRunRestartInProgress, tutorialActive]);
  useWorkbenchTutorialOwnership(ports);
  useEffect(() => scheduleWorkbenchTutorialHandoffRecovery(ports), [ports.initialTutorialHandoffRecovery]);
};
