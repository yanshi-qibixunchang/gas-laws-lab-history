import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoProfile,
  HEAT_CAPACITY_TEACHING_PROFILE_TEMPERATURE_CALIBRATION_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';
import {
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
} from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  createDefaultHeatCapacityFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createHeatCapacityPersistencePayload,
  restoreHeatCapacityFileFromPersistencePayload,
} from '../../src/features/workbench/workbenchHeatCapacityPersistence.ts';
import {
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  decodeWorkbenchSession,
  WORKBENCH_SESSION_VERSION,
} from '../../src/features/workbench/workbenchSession.ts';

const currentProfile = createHeatCapacityAutoDemoProfile(() => 0.5);
const {
  temperatureCalibrationVersion: discardedTemperatureCalibrationVersion,
  ...legacyProfileBase
} = currentProfile;
void discardedTemperatureCalibrationVersion;
const legacyProfile = {
  ...legacyProfileBase,
  ambientTemperatureMv: 1499,
  initialTemperatureMv: 1499,
  stableTemperatureMv: 1499,
  releaseTemperatureLowMv: 1498.25,
  recoveryTemperatureMv: 1499,
};

const file = {
  ...createDefaultHeatCapacityFile(1),
  heatCapacityMode: 'demo' as const,
  heatCapacityExperimentProfile: legacyProfile,
} as unknown as WorkbenchHeatCapacityState;

const restoredSession = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: file.id,
  selectedPanel: 'preview',
  files: [file],
});
const sessionProfile = restoredSession.files[0]?.kind === 'heatCapacity'
  ? restoredSession.files[0].heatCapacityExperimentProfile
  : null;
assert.equal(sessionProfile?.ambientTemperatureMv, HEAT_CAPACITY_TEMPERATURE_BASELINE_MV);
assert.equal(sessionProfile?.releaseTemperatureLowMv, 1497.76);
assert.equal(
  sessionProfile?.temperatureCalibrationVersion,
  HEAT_CAPACITY_TEACHING_PROFILE_TEMPERATURE_CALIBRATION_VERSION,
  'session restore should stamp the shared teaching-profile calibration version',
);

const currentFile = {
  ...createDefaultHeatCapacityFile(2),
  heatCapacityMode: 'demo' as const,
  heatCapacityExperimentProfile: currentProfile,
};
const legacyPayload = createHeatCapacityPersistencePayload(currentFile, 20);
legacyPayload.common.experimentProfile = legacyProfile as unknown as typeof legacyPayload.common.experimentProfile;
const restoredExperimentFile = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: currentFile.id,
  kind: 'heatCapacity',
  name: currentFile.name,
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: legacyPayload as unknown as Record<string, unknown>,
}, legacyPayload, 1);
assert.equal(
  restoredExperimentFile.heatCapacityExperimentProfile?.ambientTemperatureMv,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
);
assert.equal(
  restoredExperimentFile.heatCapacityExperimentProfile?.releaseTemperatureLowMv,
  1497.76,
  'experiment-file restore should migrate the same legacy profile as session restore',
);

const currentPayload = createHeatCapacityPersistencePayload(currentFile, 21);
const restoredCurrentFile = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: currentFile.id,
  kind: 'heatCapacity',
  name: currentFile.name,
  createdAt: 10,
  updatedAt: 21,
  layout: {},
  payload: currentPayload as unknown as Record<string, unknown>,
}, currentPayload, 2);
assert.deepEqual(
  restoredCurrentFile.heatCapacityExperimentProfile,
  currentProfile,
  'a current teaching profile should round-trip without changing its scripted targets',
);

console.log('heatCapacityTeachingProfilePersistence tests passed');
