import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { normalizeHeatCapacityFileName } from './workbenchHeatCapacityFileFactory.ts';
import { cloneHardSphereEngineSnapshot } from './workbenchHardSpherePersistence.ts';
import {
  normalizeIdealWindowLayoutState,
  normalizeStandardResultsLayout,
} from './workbenchLayoutCompatibility.ts';
import { clonePersistenceValue } from './workbenchPersistenceValue.ts';

export const cloneWorkbenchFiles = (
  files: WorkbenchFileState[],
): WorkbenchFileState[] => files.map((file): WorkbenchFileState => {
  const clonedFile = clonePersistenceValue(file);
  if (clonedFile.kind === 'standard') {
    return {
      ...clonedFile,
      hardSphereEngineSnapshot: cloneHardSphereEngineSnapshot(clonedFile.hardSphereEngineSnapshot),
      standardResultsLayout: normalizeStandardResultsLayout(clonedFile.standardResultsLayout),
    };
  }
  if (clonedFile.kind === 'ideal') {
    return {
      ...clonedFile,
      hardSphereEngineSnapshot: cloneHardSphereEngineSnapshot(clonedFile.hardSphereEngineSnapshot),
      idealWindowLayout: normalizeIdealWindowLayoutState(clonedFile.idealWindowLayout),
    };
  }
  if (clonedFile.kind === 'heatCapacity') {
    return {
      ...clonedFile,
      name: normalizeHeatCapacityFileName(clonedFile.name),
    };
  }
  return clonedFile;
});
