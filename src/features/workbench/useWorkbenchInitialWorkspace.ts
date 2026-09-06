import { resolveWorkbenchInitialSession, selectWorkbenchInitialRefreshSession } from './workbenchInitialSession.ts';
import { useMemo, useState } from 'react';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { loadClosedWorkbenchFiles, loadWorkbenchSession } from './workbenchSession.ts';
import { loadWorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { loadWorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { prepareHeatCapacityFileForExploreOnOpen } from './workbenchHeatCapacityModeSession.ts';
import { loadAppExperienceProfile } from '../learning/experimentLearningStore.ts';
import { loadExperimentTutorialHandoff, shouldReconstructExperimentTutorial } from '../learning/workbenchTutorialCoordinator.ts';

export const useWorkbenchInitialWorkspace = () => {
  const [initialExperienceProfileLoad] = useState(() => loadAppExperienceProfile());
  const [initialTutorialHandoff] = useState(() => loadExperimentTutorialHandoff());
  const initialActiveTutorialExperiment = initialExperienceProfileLoad.profile.activeTutorialExperiment;
  const initialTutorialReconstruction = shouldReconstructExperimentTutorial(
    initialExperienceProfileLoad.profile,
  );
  const initialTutorialHandoffRecovery = (
    initialTutorialHandoff.status === 'loaded' &&
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
  const [initialSession] = useState(() => resolveWorkbenchInitialSession({
    initialTutorialReconstruction, initialActiveTutorialExperiment, initialTutorialHandoffRecovery,
    initialTutorialHandoff, initialOrdinarySession, initialOrdinaryClosedFiles,
    readLayoutDefaults: loadWorkbenchLayoutDefaults,
  }));
  const [loadedHeatCapacityRefreshSession] = useState(() => (
    initialTutorialReconstruction ? null : loadWorkbenchHeatCapacityRefreshSession()
  ));
  const initialHeatCapacityRefreshSession = useMemo(() => selectWorkbenchInitialRefreshSession(
    initialSession, loadedHeatCapacityRefreshSession,
  ), [initialSession, loadedHeatCapacityRefreshSession]);
  return { initialExperienceProfileLoad, initialTutorialHandoff, initialActiveTutorialExperiment, initialTutorialReconstruction, initialTutorialHandoffRecovery, initialOrdinarySession, initialOrdinaryClosedFiles, initialSession, initialHeatCapacityRefreshSession };
};
