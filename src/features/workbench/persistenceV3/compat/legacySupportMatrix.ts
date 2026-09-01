import {
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
} from '../contract.ts';
import {
  WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION,
} from '../codecRegistry.ts';

export const LEGACY_WORKBENCH_WORKSPACE_SCHEMA_FAMILY =
  'hard-sphere-lab.workbench-session' as const;
export const LEGACY_WORKBENCH_FILE_SCHEMA_FAMILY =
  'hard-sphere-lab.experiment-file' as const;

export const WORKBENCH_PERSISTENCE_LEGACY_SUPPORT_MATRIX = Object.freeze({
  migrationBaselineVersion: 1,
  workspace: Object.freeze({
    schemaFamily: LEGACY_WORKBENCH_WORKSPACE_SCHEMA_FAMILY,
    supportedSchemaVersions: Object.freeze([2] as const),
  }),
  fileEnvelope: Object.freeze({
    schemaFamily: LEGACY_WORKBENCH_FILE_SCHEMA_FAMILY,
    supportedSchemaVersions: Object.freeze([1] as const),
  }),
  currentWorkspace: Object.freeze({
    schemaFamily: WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
  }),
  currentFile: Object.freeze({
    schemaFamily: WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_VERSION,
  }),
} as const);

export type WorkbenchPersistenceWorkspaceSchemaClass =
  | 'current-v3'
  | 'legacy-family'
  | 'unknown';

export type WorkbenchPersistenceFileSchemaClass =
  | 'current-v3'
  | 'legacy-family'
  | 'unknown';

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const classifyWorkbenchWorkspaceSchema = (
  value: unknown,
): WorkbenchPersistenceWorkspaceSchemaClass => {
  if (!isPlainRecord(value)) return 'unknown';
  if (value.schemaFamily === WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY) {
    return 'current-v3';
  }
  if (value.schemaFamily === LEGACY_WORKBENCH_WORKSPACE_SCHEMA_FAMILY) {
    return 'legacy-family';
  }
  return 'unknown';
};

export const classifyWorkbenchFileSchema = (
  value: unknown,
): WorkbenchPersistenceFileSchemaClass => {
  if (!isPlainRecord(value)) return 'unknown';
  if (value.schemaFamily === WORKBENCH_PERSISTENCE_V3_FILE_SCHEMA_FAMILY) {
    return 'current-v3';
  }
  if (value.schemaFamily === LEGACY_WORKBENCH_FILE_SCHEMA_FAMILY) {
    return 'legacy-family';
  }
  return 'unknown';
};
