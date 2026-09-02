import type { WorkbenchFileKind } from './workbenchFileKind.ts';
import {
  isPersistenceFiniteNumber as isFiniteNumber,
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';
import { isWorkbenchFileKind } from './workbenchFileKind.ts';
import {
  isRestorableWorkbenchPanelKey,
  type RestorableWorkbenchPanelKey,
} from './workbenchPanelCompatibility.ts';

export const WORKBENCH_SESSION_SCHEMA_FAMILY = 'hard-sphere-lab.workbench-session' as const;
export const WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY = 'hard-sphere-lab.experiment-file' as const;
export const WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY = 'hard-sphere-lab.closed-files' as const;

export const WORKBENCH_SESSION_SCHEMA_VERSION = 2 as const;
export const WORKBENCH_FILE_SCHEMA_VERSION = 1 as const;
export const WORKBENCH_CLOSED_FILES_SCHEMA_VERSION = 1 as const;

export interface WorkbenchPersistenceDiagnostic {
  level: 'info' | 'warning' | 'error';
  code:
    | 'unsupported-future-version'
    | 'invalid-envelope'
    | 'invalid-file';
  message: string;
  fileId?: string;
}

export interface WorkbenchExperimentFileEnvelopeV1 {
  schemaFamily: typeof WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY;
  fileSchemaVersion: typeof WORKBENCH_FILE_SCHEMA_VERSION;
  id: string;
  kind: WorkbenchFileKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  layout: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export interface WorkbenchSessionEnvelopeV2 {
  schemaFamily: typeof WORKBENCH_SESSION_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_SESSION_SCHEMA_VERSION;
  appVersion: string;
  savedAt: number;
  activeFileId: string | null;
  selectedPanel: RestorableWorkbenchPanelKey;
  files: WorkbenchExperimentFileEnvelopeV1[];
  heatCapacityGuideSession?: {
    fileId: string | null;
    strongReminderActive: boolean;
    strongReminderControlId?: string | null;
  };
}

export interface WorkbenchClosedFilesEnvelopeV1 {
  schemaFamily: typeof WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_CLOSED_FILES_SCHEMA_VERSION;
  appVersion: string;
  savedAt: number;
  files: WorkbenchExperimentFileEnvelopeV1[];
}

export const isWorkbenchExperimentFileEnvelope = (
  value: unknown,
): value is WorkbenchExperimentFileEnvelopeV1 => (
  isRecord(value) &&
  value.schemaFamily === WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY &&
  value.fileSchemaVersion === WORKBENCH_FILE_SCHEMA_VERSION &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isWorkbenchFileKind(value.kind) &&
  isFiniteNumber(value.createdAt) &&
  isFiniteNumber(value.updatedAt) &&
  (value.lastOpenedAt === undefined || isFiniteNumber(value.lastOpenedAt)) &&
  isRecord(value.layout) &&
  isRecord(value.payload)
);

export const isWorkbenchSessionEnvelope = (
  value: unknown,
): value is WorkbenchSessionEnvelopeV2 => (
  isRecord(value) &&
  value.schemaFamily === WORKBENCH_SESSION_SCHEMA_FAMILY &&
  value.schemaVersion === WORKBENCH_SESSION_SCHEMA_VERSION &&
  typeof value.appVersion === 'string' &&
  isFiniteNumber(value.savedAt) &&
    (typeof value.activeFileId === 'string' || value.activeFileId === null) &&
    isRestorableWorkbenchPanelKey(value.selectedPanel) &&
    Array.isArray(value.files) &&
    value.files.every(isWorkbenchExperimentFileEnvelope) &&
    (
      value.heatCapacityGuideSession === undefined ||
      (
        isRecord(value.heatCapacityGuideSession) &&
        (
          typeof value.heatCapacityGuideSession.fileId === 'string' ||
          value.heatCapacityGuideSession.fileId === null
        ) &&
        typeof value.heatCapacityGuideSession.strongReminderActive === 'boolean' &&
        (
          value.heatCapacityGuideSession.strongReminderControlId === undefined ||
          typeof value.heatCapacityGuideSession.strongReminderControlId === 'string' ||
          value.heatCapacityGuideSession.strongReminderControlId === null
        )
      )
    )
);

export const isWorkbenchClosedFilesEnvelope = (
  value: unknown,
): value is WorkbenchClosedFilesEnvelopeV1 => (
  isRecord(value) &&
  value.schemaFamily === WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY &&
  value.schemaVersion === WORKBENCH_CLOSED_FILES_SCHEMA_VERSION &&
  typeof value.appVersion === 'string' &&
  isFiniteNumber(value.savedAt) &&
  Array.isArray(value.files) &&
  value.files.every(isWorkbenchExperimentFileEnvelope)
);
