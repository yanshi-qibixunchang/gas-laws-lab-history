import type {
  WorkbenchFileKind,
  WorkbenchPanelKey,
} from './workbenchState.ts';

export const WORKBENCH_SESSION_SCHEMA_FAMILY = 'hard-sphere-lab.workbench-session' as const;
export const WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY = 'hard-sphere-lab.experiment-file' as const;
export const WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY = 'hard-sphere-lab.closed-files' as const;

export const WORKBENCH_SESSION_SCHEMA_VERSION = 2 as const;
export const WORKBENCH_FILE_SCHEMA_VERSION = 1 as const;
export const WORKBENCH_CLOSED_FILES_SCHEMA_VERSION = 1 as const;

export const WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH: string | null = null;

export type WorkbenchUnsupportedFutureVersionPolicy = 'reject' | 'readonly';

export interface WorkbenchPersistenceDiagnostic {
  level: 'info' | 'warning' | 'error';
  code:
    | 'legacy-session'
    | 'development-cache-reset'
    | 'unsupported-future-version'
    | 'invalid-envelope'
    | 'invalid-file'
    | 'readonly-future-version';
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
  selectedPanel: WorkbenchPanelKey;
  files: WorkbenchExperimentFileEnvelopeV1[];
  heatCapacityGuideSession?: {
    fileId: string | null;
    strongReminderActive: boolean;
  };
}

export interface WorkbenchClosedFilesEnvelopeV1 {
  schemaFamily: typeof WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY;
  schemaVersion: typeof WORKBENCH_CLOSED_FILES_SCHEMA_VERSION;
  appVersion: string;
  savedAt: number;
  files: WorkbenchExperimentFileEnvelopeV1[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isWorkbenchFileKind = (value: unknown): value is WorkbenchFileKind => (
  value === 'standard' || value === 'ideal' || value === 'heatCapacity'
);

export const getWorkbenchUnsupportedFutureVersionPolicy = (): WorkbenchUnsupportedFutureVersionPolicy => (
  WORKBENCH_OFFICIAL_COMPATIBILITY_EPOCH === null ? 'reject' : 'readonly'
);

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
    typeof value.selectedPanel === 'string' &&
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
        typeof value.heatCapacityGuideSession.strongReminderActive === 'boolean'
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
