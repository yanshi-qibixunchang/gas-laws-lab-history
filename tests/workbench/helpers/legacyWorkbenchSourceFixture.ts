import {
  createHeatCapacityPersistencePayload,
} from '../../../src/features/workbench/workbenchHeatCapacityPersistence.ts';
import {
  createIdealGasPersistencePayload,
} from '../../../src/features/workbench/workbenchIdealGasPersistence.ts';
import {
  createPistonOscillationPersistencePayload,
} from '../../../src/features/workbench/workbenchPistonOscillationPersistence.ts';
import {
  createStandardPersistencePayload,
} from '../../../src/features/workbench/workbenchStandardPersistence.ts';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  type WorkbenchExperimentFileEnvelopeV1,
} from '../../../src/features/workbench/workbenchPersistenceSchema.ts';
import type {
  WorkbenchFileState,
} from '../../../src/features/workbench/workbenchState.ts';
import {
  assertNeverWorkbenchFileKind,
} from '../../../src/features/workbench/workbenchFileKind.ts';

const createLegacyPayloadFixture = (
  file: WorkbenchFileState,
  savedAt: number,
): Record<string, unknown> => {
  switch (file.kind) {
    case 'standard':
      return createStandardPersistencePayload(
        file,
        savedAt,
      ) as unknown as Record<string, unknown>;
    case 'ideal':
      return createIdealGasPersistencePayload(
        file,
        savedAt,
      ) as unknown as Record<string, unknown>;
    case 'heatCapacity':
      return createHeatCapacityPersistencePayload(
        file,
        savedAt,
      ) as unknown as Record<string, unknown>;
    case 'heatCapacityPistonOscillation':
      return createPistonOscillationPersistencePayload(
        file,
        savedAt,
      ) as unknown as Record<string, unknown>;
    default:
      return assertNeverWorkbenchFileKind(file);
  }
};

export const createLegacyWorkbenchFileEnvelopeFixture = (
  file: WorkbenchFileState,
  savedAt: number,
): WorkbenchExperimentFileEnvelopeV1 => ({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: file.id,
  kind: file.kind,
  name: file.name,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
  lastOpenedAt: file.lastOpenedAt,
  layout: {
    visiblePanels: [...file.visiblePanels],
    liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
    ...(file.kind === 'standard'
      ? { standardResultsLayout: structuredClone(file.standardResultsLayout) }
      : {}),
    ...(file.kind === 'ideal'
      ? { idealWindowLayout: structuredClone(file.idealWindowLayout) }
      : {}),
    ...(file.kind === 'heatCapacity'
      ? {
          openHeatCapacityTabs: [...file.openHeatCapacityTabs],
          activeHeatCapacityTabId: file.activeHeatCapacityTabId,
        }
      : {}),
  },
  payload: createLegacyPayloadFixture(file, savedAt),
});
