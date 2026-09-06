import { type WorkbenchFileState } from './workbenchFileUnion.ts';
import { type WorkbenchPanelKey } from './workbenchFileState.ts';
import { type ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import { type WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from './workbenchPistonOscillationState.ts';
import { getExperimentTutorialFileId, getExperimentTutorialFileName } from '../learning/workbenchTutorialCoordinator.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { enterHeatCapacityExploreModeWorkbenchState } from './workbenchHeatCapacityModeSession.ts';
import { loadWorkbenchArchivedNamespaceSnapshot } from './workbenchIndexedDbPersistence.ts';
import { areCanonicalPersistenceValuesEqual } from './workbenchWorkspaceFileValidation.ts';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { assertUniqueWorkbenchFileCollections } from './workbenchFileIdentity.ts';

export interface TutorialOrdinaryWorkspace {
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

export const createExperimentTutorialRuntimeFile = (
  experiment: ExperimentLearningId,
  defaults?: WorkbenchLayoutDefaults,
  now = Date.now(),
): WorkbenchFileState => {
  if (experiment === 'pistonOscillation') {
    return {
      ...createDefaultHeatCapacityPistonOscillationFile(
        1,
        defaults?.heatCapacityPistonOscillation,
      ),
      id: getExperimentTutorialFileId(experiment),
      name: getExperimentTutorialFileName(experiment),
      updatedAt: now,
    };
  }
  const defaultFile = createDefaultHeatCapacityFile(1, defaults?.heatCapacity);
  return enterHeatCapacityExploreModeWorkbenchState({
    ...defaultFile,
    id: getExperimentTutorialFileId(experiment),
    name: getExperimentTutorialFileName(experiment),
    updatedAt: now,
  }, defaultFile, now);
};

export const mergeArchivedNamespacesIntoTutorialWorkspace = async (
  workspace: TutorialOrdinaryWorkspace,
  namespaces: readonly string[],
): Promise<TutorialOrdinaryWorkspace> => {
  if (namespaces.length === 0) return workspace;
  const archivedSnapshots = await Promise.all(
    namespaces.map(async (namespace) => {
      const snapshot = await loadWorkbenchArchivedNamespaceSnapshot(namespace);
      if (!snapshot) {
        throw new Error(`Saved workbench data could not be restored for ${namespace}.`);
      }
      return snapshot;
    }),
  );
  const archivedFiles = archivedSnapshots.flatMap((snapshot) => [
    ...snapshot.files,
    ...snapshot.closedFiles,
  ]);
  const existingFilesById = new Map(
    [...workspace.files, ...workspace.closedFiles].map((file) => [file.id, file]),
  );
  const filesToArchive = archivedFiles.filter((file) => {
    const existing = existingFilesById.get(file.id);
    if (!existing) {
      existingFilesById.set(file.id, file);
      return true;
    }
    if (!areCanonicalPersistenceValuesEqual(existing, file)) {
      throw new Error(`Two saved experiment files share the same identity: ${file.id}.`);
    }
    return false;
  });
  const merged = {
    ...workspace,
    files: cloneWorkbenchFiles(workspace.files),
    closedFiles: cloneWorkbenchFiles([
      ...workspace.closedFiles,
      ...filesToArchive,
    ]),
  };
  assertUniqueWorkbenchFileCollections(merged.files, merged.closedFiles, merged.activeFileId);
  return merged;
};
