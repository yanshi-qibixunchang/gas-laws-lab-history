import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
  isWorkbenchClosedFilesEnvelope,
  isWorkbenchExperimentFileEnvelope,
  isWorkbenchSessionEnvelope,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import * as persistenceValueModule from '../../src/features/workbench/workbenchPersistenceValue.ts';
import * as panelRegistryModule from '../../src/features/workbench/workbenchPanelRegistry.ts';

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
  id: 'heatCapacityPistonOscillation-001',
  kind: 'heatCapacityPistonOscillation',
  name: 'Piston Oscillation - 001',
}), true);
assert.equal(isWorkbenchExperimentFileEnvelope({
  ...baseFileEnvelope,
  kind: 'heatCapacityPiston',
}), false);
assert.equal(isWorkbenchExperimentFileEnvelope({
  ...baseFileEnvelope,
  lastOpenedAt: 'yesterday',
}), false);
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

const workbenchSourceRoot = join(process.cwd(), 'src', 'features', 'workbench');
const persistenceValuePath = join(workbenchSourceRoot, 'workbenchPersistenceValue.ts');
const persistenceValueSource = existsSync(persistenceValuePath)
  ? readFileSync(persistenceValuePath, 'utf8')
  : '';
const hardSpherePersistenceSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchHardSpherePersistence.ts'),
  'utf8',
);
const standardPersistenceSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchStandardPersistence.ts'),
  'utf8',
);
const idealGasPersistenceSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchIdealGasPersistence.ts'),
  'utf8',
);
const heatCapacityPersistenceSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchHeatCapacityPersistence.ts'),
  'utf8',
);
const persistenceSchemaSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchPersistenceSchema.ts'),
  'utf8',
);
const persistenceMigrationSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchPersistenceMigration.ts'),
  'utf8',
);
const sessionSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchSession.ts'),
  'utf8',
);
const runtimePersistenceSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchRuntimePersistence.ts'),
  'utf8',
);
const heatCapacitySessionRestoreSource = readFileSync(
  join(workbenchSourceRoot, 'workbenchHeatCapacitySessionRestore.ts'),
  'utf8',
);

assert.deepEqual(panelRegistryModule.WORKBENCH_PANEL_KEYS, [
  'preview',
  'realtime',
  'results',
  'experimentPoints',
  'verification',
  'heatCapacityGuide',
  'heatCapacityRecords',
  'heatCapacityReview',
  'history',
]);
assert.equal(panelRegistryModule.isWorkbenchPanelKey('preview'), true);
assert.equal(panelRegistryModule.isWorkbenchPanelKey('unknown-panel'), false);
assert.deepEqual(
  panelRegistryModule.normalizeWorkbenchPanelKeys(['preview', 'unknown-panel', 'history'], ['realtime']),
  ['preview', 'history'],
);
assert.deepEqual(
  panelRegistryModule.normalizeWorkbenchPanelKeys(null, ['realtime']),
  ['realtime'],
);

assert.equal(
  existsSync(persistenceValuePath),
  true,
  'shared persistence value helpers should live outside hard-sphere persistence',
);
assert.match(persistenceValueSource, /export const clonePersistenceValue/);
assert.match(persistenceValueSource, /export const isPersistenceRecord/);
assert.match(persistenceValueSource, /export const isPersistenceFiniteNumber/);
assert.equal(typeof persistenceValueModule.normalizePersistenceNullableNumber, 'function');
assert.equal(persistenceValueModule.normalizePersistenceNullableNumber(12.5), 12.5);
assert.equal(persistenceValueModule.normalizePersistenceNullableNumber(Number.POSITIVE_INFINITY), null);
assert.equal(persistenceValueModule.normalizePersistenceNullableNumber('12.5'), null);
assert.match(persistenceValueSource, /export const normalizePersistenceNullableNumber/);
assert.doesNotMatch(
  hardSpherePersistenceSource,
  /export const clonePersistenceValue\s*=/,
  'hard-sphere persistence should not own generic value cloning',
);
assert.doesNotMatch(
  heatCapacityPersistenceSource,
  /const clonePersistenceValue\s*=/,
  'heat-capacity persistence should use the shared value cloner',
);
assert.match(standardPersistenceSource, /from '\.\/workbenchPersistenceValue\.ts'/);
assert.match(idealGasPersistenceSource, /from '\.\/workbenchPersistenceValue\.ts'/);
assert.match(heatCapacityPersistenceSource, /from '\.\/workbenchPersistenceValue\.ts'/);
assert.match(
  persistenceSchemaSource,
  /from '\.\/workbenchPersistenceValue\.ts'/,
  'schema validators should use shared persistence value guards',
);
assert.match(
  persistenceMigrationSource,
  /from '\.\/workbenchPersistenceValue\.ts'/,
  'migration decoders should use shared persistence value guards',
);
assert.doesNotMatch(
  persistenceSchemaSource,
  /const isRecord\s*=/,
  'schema validators should not keep a local record guard',
);
assert.doesNotMatch(
  persistenceSchemaSource,
  /const isFiniteNumber\s*=/,
  'schema validators should not keep a local finite-number guard',
);
assert.doesNotMatch(
  persistenceMigrationSource,
  /const isRecord\s*=/,
  'migration decoders should not keep a local record guard',
);
assert.match(
  sessionSource,
  /from '\.\/workbenchPersistenceValue\.ts'/,
  'session restore should use shared persistence value helpers',
);
assert.doesNotMatch(
  sessionSource,
  /const isRecord\s*=/,
  'session restore should not keep a local record guard',
);
assert.doesNotMatch(
  sessionSource,
  /const normalizeNullableNumber\s*=/,
  'session restore should use the shared nullable-number normalizer',
);
assert.doesNotMatch(
  sessionSource,
  /Number\.isFinite/,
  'session restore should not keep ad hoc finite-number checks',
);
for (const [sourceName, source, dependency] of [
  ['standard persistence', standardPersistenceSource, 'workbenchRuntimePersistence'],
  ['ideal-gas persistence', idealGasPersistenceSource, 'workbenchRuntimePersistence'],
  ['session restore', sessionSource, 'workbenchPanelRegistry'],
] as const) {
  assert.match(
    source,
    new RegExp(`from '\\.\\/${dependency}\\.ts'`),
    `${sourceName} should use its shared persistence boundary`,
  );
  assert.doesNotMatch(
    source,
    /const panelKeys\s*=/,
    `${sourceName} should not keep a local full panel registry`,
  );
}
assert.match(
  runtimePersistenceSource,
  /from '\.\/workbenchPanelRegistry\.ts'/,
  'shared runtime persistence should own panel registry normalization',
);
assert.match(
  heatCapacitySessionRestoreSource,
  /isHeatCapacityPanelKey[\s\S]*from '\.\/workbenchHeatCapacityTabRegistry\.ts'/,
  'heat-capacity session restore should use the heat-capacity-specific panel registry',
);
assert.doesNotMatch(
  heatCapacitySessionRestoreSource,
  /const panelKeys\s*=/,
  'heat-capacity session restore should not keep a local panel registry',
);

console.log('workbenchPersistenceSchema tests passed');
