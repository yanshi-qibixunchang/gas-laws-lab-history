import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoProfile,
} from '../../src/domain/heatCapacity/heatCapacityTeachingProfile.ts';
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

const file = {
  ...createDefaultHeatCapacityFile(1),
  heatCapacityMode: 'demo' as const,
  heatCapacityExperimentProfile: currentProfile,
} satisfies WorkbenchHeatCapacityState;

const restoredSession = decodeWorkbenchSession({
  version: WORKBENCH_SESSION_VERSION,
  activeFileId: file.id,
  selectedPanel: 'preview',
  files: [file],
});
const sessionProfile = restoredSession.files[0]?.kind === 'heatCapacity'
  ? restoredSession.files[0].heatCapacityExperimentProfile
  : null;
assert.deepEqual(sessionProfile, currentProfile);

const currentFile = {
  ...createDefaultHeatCapacityFile(2),
  heatCapacityMode: 'demo' as const,
  heatCapacityExperimentProfile: currentProfile,
};
const currentPayload = createHeatCapacityPersistencePayload(currentFile, 20);
const restoredExperimentFile = restoreHeatCapacityFileFromPersistencePayload({
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: currentFile.id,
  kind: 'heatCapacity',
  name: currentFile.name,
  createdAt: 10,
  updatedAt: 20,
  layout: {},
  payload: currentPayload as unknown as Record<string, unknown>,
}, currentPayload, 1);
assert.deepEqual(
  restoredExperimentFile.heatCapacityExperimentProfile,
  currentProfile,
  'a current teaching profile should round-trip without changing its scripted targets',
);

console.log('heatCapacityTeachingProfilePersistence tests passed');
