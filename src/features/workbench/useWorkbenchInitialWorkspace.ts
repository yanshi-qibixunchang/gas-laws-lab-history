import { createWorkbenchTourHomeSession, resolveWorkbenchInitialSession, selectWorkbenchInitialRefreshSession } from './workbenchInitialSession.ts';
import { useMemo, useState } from 'react';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { loadClosedWorkbenchFiles, loadWorkbenchSession } from './workbenchSession.ts';
import { loadWorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { loadWorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { prepareHeatCapacityFileForExploreOnOpen } from './workbenchHeatCapacityModeSession.ts';
import { loadAppExperienceProfile } from '../learning/experimentLearningStore.ts';
import { loadExperimentTutorialHandoff, shouldReconstructExperimentTutorial } from '../learning/workbenchTutorialCoordinator.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from './workbenchPistonOscillationState.ts';
import { WORKSPACE_TOUR_FILE_ID } from '../onboarding/workspaceTourModel.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

const tourFileNames: Record<WorkbenchLanguagePreference, string> = {
  'zh-CN': '活塞振动法 · 界面导览',
  'zh-TW': '活塞振動法 · 介面導覽',
  en: 'Piston Oscillation · Workspace Tour',
};

export const useWorkbenchInitialWorkspace = (
  tourLanguage?: WorkbenchLanguagePreference,
  showTourHome = false,
) => {
  const [initialExperienceProfileLoad] = useState(() => loadAppExperienceProfile());
  const [initialTutorialHandoff] = useState(() => loadExperimentTutorialHandoff());
  const initialActiveTutorialExperiment = initialExperienceProfileLoad.profile.activeTutorialExperiment;
  const initialTutorialReconstruction = tourLanguage === undefined && shouldReconstructExperimentTutorial(
    initialExperienceProfileLoad.profile,
  );
  const initialTutorialHandoffRecovery = (
    tourLanguage === undefined && initialTutorialHandoff.status === 'loaded' &&
    initialExperienceProfileLoad.profile.learning[initialTutorialHandoff.marker.experiment] === 'unlocked' &&
    initialExperienceProfileLoad.profile.activeTutorialExperiment === null
  );
  const [initialOrdinarySession] = useState(() => {
    const session = loadWorkbenchSession();
    const now = Date.now();
    return {
      ...session,
      files: session.files.map((file, index) => (
        file.kind === 'heatCapacity'
          ? prepareHeatCapacityFileForExploreOnOpen(
              file,
              createDefaultHeatCapacityFile(index + 1),
              now,
            )
          : file
      )),
    };
  });
  const [initialOrdinaryClosedFiles] = useState(() => {
    const now = Date.now();
    return loadClosedWorkbenchFiles().map((file, index) => (
      file.kind === 'heatCapacity'
        ? prepareHeatCapacityFileForExploreOnOpen(
            file,
            createDefaultHeatCapacityFile(index + 1),
            now,
          )
        : file
    ));
  });
  const [initialTourHome] = useState(() => showTourHome
    && !initialTutorialReconstruction && !initialTutorialHandoffRecovery
    ? createWorkbenchTourHomeSession(initialOrdinarySession, initialOrdinaryClosedFiles)
    : null);
  const [initialSession] = useState(() => {
    if (tourLanguage !== undefined) {
      return {
        files: [{
          ...createDefaultHeatCapacityPistonOscillationFile(),
          id: WORKSPACE_TOUR_FILE_ID,
          name: tourFileNames[tourLanguage],
          pistonOscillationLessonIntroAutoShown: true,
        }],
        activeFileId: WORKSPACE_TOUR_FILE_ID,
        selectedPanel: 'preview' as const,
      };
    }
    if (initialTourHome) return initialTourHome.session;
    return resolveWorkbenchInitialSession({
      initialTutorialReconstruction, initialActiveTutorialExperiment, initialTutorialHandoffRecovery,
      initialTutorialHandoff, initialOrdinarySession, initialOrdinaryClosedFiles,
      readLayoutDefaults: loadWorkbenchLayoutDefaults,
    });
  });
  const [loadedHeatCapacityRefreshSession] = useState(() => (
    tourLanguage !== undefined || initialTutorialReconstruction ? null : loadWorkbenchHeatCapacityRefreshSession()
  ));
  const initialHeatCapacityRefreshSession = useMemo(() => selectWorkbenchInitialRefreshSession(
    initialSession, loadedHeatCapacityRefreshSession,
  ), [initialSession, loadedHeatCapacityRefreshSession]);
  return { initialExperienceProfileLoad, initialTutorialHandoff, initialActiveTutorialExperiment, initialTutorialReconstruction, initialTutorialHandoffRecovery, initialOrdinarySession, initialOrdinaryClosedFiles, initialSession, initialHeatCapacityRefreshSession, initialTourHome };
};
