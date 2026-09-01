import {
  migrateLegacyHeatCapacityFreeExperimentGroups,
} from '../../workbenchHeatCapacityExperimentGroupMigration.ts';
import {
  decodeWorkbenchPersistenceV3FileRecord,
  type WorkbenchPersistenceV3FileDecodeOptions,
} from '../codecRegistry.ts';

const LEGACY_V3_PROJECTION_OPTIONS: WorkbenchPersistenceV3FileDecodeOptions = {
  projectionCompatibility: {
    migrateMissingHeatCapacityExperimentGroups:
      migrateLegacyHeatCapacityFreeExperimentGroups,
  },
};

export const decodeCompatibleWorkbenchV3FileRecord = (
  raw: unknown,
  index = 1,
) => decodeWorkbenchPersistenceV3FileRecord(
  raw,
  index,
  LEGACY_V3_PROJECTION_OPTIONS,
);
