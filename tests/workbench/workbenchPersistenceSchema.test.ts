import assert from 'node:assert/strict';
import {
  WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
  getWorkbenchUnsupportedFutureVersionPolicy,
  isWorkbenchClosedFilesEnvelope,
  isWorkbenchExperimentFileEnvelope,
  isWorkbenchSessionEnvelope,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';

const baseFileEnvelope = {
  schemaFamily: WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  fileSchemaVersion: WORKBENCH_FILE_SCHEMA_VERSION,
  id: 'heatCapacity-001',
  kind: 'heatCapacity',
  name: 'Heat Capacity Ratio - 001',
  createdAt: 1,
  updatedAt: 1,
  layout: {},
  payload: {},
};

assert.equal(WORKBENCH_SESSION_SCHEMA_FAMILY, 'hard-sphere-lab.workbench-session');
assert.equal(WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY, 'hard-sphere-lab.experiment-file');
assert.equal(WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY, 'hard-sphere-lab.closed-files');
assert.equal(WORKBENCH_SESSION_SCHEMA_VERSION, 2);
assert.equal(WORKBENCH_FILE_SCHEMA_VERSION, 1);
assert.equal(WORKBENCH_CLOSED_FILES_SCHEMA_VERSION, 1);
assert.equal(WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH, null);
assert.equal(
  getWorkbenchUnsupportedFutureVersionPolicy(),
  'reject',
  'before the first formal release, unsupported future files must be rejected',
);

assert.equal(isWorkbenchSessionEnvelope({
  schemaFamily: WORKBENCH_SESSION_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  appVersion: '4.1.3',
  savedAt: 1,
  activeFileId: null,
  selectedPanel: 'preview',
  files: [],
}), true);

assert.equal(isWorkbenchSessionEnvelope({
  schemaFamily: 'other',
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  files: [],
}), false);

assert.equal(isWorkbenchExperimentFileEnvelope(baseFileEnvelope), true);
assert.equal(isWorkbenchExperimentFileEnvelope({
  ...baseFileEnvelope,
  fileSchemaVersion: 999,
}), false);

assert.equal(isWorkbenchClosedFilesEnvelope({
  schemaFamily: WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  appVersion: '4.1.3',
  savedAt: 1,
  files: [baseFileEnvelope],
}), true);

assert.equal(isWorkbenchClosedFilesEnvelope({
  schemaFamily: WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_CLOSED_FILES_SCHEMA_VERSION + 1,
  appVersion: '4.1.3',
  savedAt: 1,
  files: [baseFileEnvelope],
}), false);

console.log('workbenchPersistenceSchema tests passed');
