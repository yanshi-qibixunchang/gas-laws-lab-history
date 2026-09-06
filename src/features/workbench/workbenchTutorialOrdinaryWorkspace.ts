import { initializeWorkbenchIndexedDbPersistence } from './workbenchIndexedDbPersistence.ts';
import { loadWorkbenchSession, loadClosedWorkbenchFiles } from './workbenchSession.ts';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { prepareHeatCapacityFileForExploreOnOpen } from './workbenchHeatCapacityModeSession.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { TutorialOrdinaryWorkspace } from './workbenchExperimentTutorialWorkspace.ts';
export interface WorkbenchTutorialOrdinaryWorkspacePorts {
  tutorialOrdinaryWorkspaceRef: { current: TutorialOrdinaryWorkspace | null };
  tutorialOrdinaryWorkspaceRefreshRef: { current: Promise<TutorialOrdinaryWorkspace> | null };
}
const defaultReadAdapters = { initializeWorkbenchIndexedDbPersistence, loadWorkbenchSession, loadClosedWorkbenchFiles };
export const createWorkbenchTutorialOrdinaryWorkspaceActions = ({ tutorialOrdinaryWorkspaceRef, tutorialOrdinaryWorkspaceRefreshRef }: WorkbenchTutorialOrdinaryWorkspacePorts, { initializeWorkbenchIndexedDbPersistence, loadWorkbenchSession, loadClosedWorkbenchFiles } = defaultReadAdapters) => {
  const refreshTutorialOrdinaryWorkspaceFromPersistence = () => {
    if (tutorialOrdinaryWorkspaceRefreshRef.current) {
      return tutorialOrdinaryWorkspaceRefreshRef.current;
    }
    const refresh = initializeWorkbenchIndexedDbPersistence()
      .then(() => {
        const session = loadWorkbenchSession();
        const now = Date.now();
        const normalizeFile = (file: WorkbenchFileState, index: number) => (
          file.kind === 'heatCapacity'
            ? prepareHeatCapacityFileForExploreOnOpen(
                file,
                createDefaultHeatCapacityFile(index + 1),
                now,
              )
            : file
        );
        const workspace: TutorialOrdinaryWorkspace = {
          files: cloneWorkbenchFiles(session.files).map(normalizeFile),
          closedFiles: cloneWorkbenchFiles(loadClosedWorkbenchFiles()).map(normalizeFile),
          activeFileId: session.activeFileId,
          selectedPanel: session.selectedPanel,
        };
        tutorialOrdinaryWorkspaceRef.current = workspace;
        return workspace;
      })
      .finally(() => {
        if (tutorialOrdinaryWorkspaceRefreshRef.current === refresh) {
          tutorialOrdinaryWorkspaceRefreshRef.current = null;
        }
      });
    tutorialOrdinaryWorkspaceRefreshRef.current = refresh;
    return refresh;
  };
  return { refreshTutorialOrdinaryWorkspaceFromPersistence };
};
