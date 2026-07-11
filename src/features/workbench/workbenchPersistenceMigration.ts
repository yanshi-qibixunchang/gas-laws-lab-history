import {
  createDefaultHeatCapacityFile,
  type WorkbenchFileState,
  type WorkbenchPanelKey,
} from './workbenchState.ts';
import type {
  WorkbenchSessionState,
} from './workbenchSession.ts';
import {
  createHeatCapacityPersistencePayload,
  restoreHeatCapacityFileFromPersistencePayload,
} from './workbenchHeatCapacityPersistence.ts';
import {
  createStandardPersistencePayload,
  restoreStandardFileFromPersistencePayload,
  validateStandardPersistencePayload,
} from './workbenchStandardPersistence.ts';
import {
  createIdealGasPersistencePayload,
  restoreIdealGasFileFromPersistencePayload,
  validateIdealGasPersistencePayload,
} from './workbenchIdealGasPersistence.ts';
import {
  normalizeHardSphereEngineSnapshot,
} from './workbenchHardSpherePersistence.ts';
import {
  WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  WORKBENCH_EXPERIMENT_FILE_SCHEMA_FAMILY,
  WORKBENCH_FILE_SCHEMA_VERSION,
  WORKBENCH_SESSION_SCHEMA_FAMILY,
  WORKBENCH_SESSION_SCHEMA_VERSION,
  isWorkbenchClosedFilesEnvelope,
  isWorkbenchSessionEnvelope,
  type WorkbenchClosedFilesEnvelopeV1,
  type WorkbenchExperimentFileEnvelopeV1,
  type WorkbenchPersistenceDiagnostic,
  type WorkbenchSessionEnvelopeV2,
} from './workbenchPersistenceSchema.ts';
import {
  isPersistenceRecord as isRecord,
} from './workbenchPersistenceValue.ts';

export interface DecodeWorkbenchStorageResult {
  session: WorkbenchSessionState;
  diagnostics: WorkbenchPersistenceDiagnostic[];
  handled: boolean;
}

export interface DecodeWorkbenchClosedFilesStorageResult {
  files: WorkbenchFileState[];
  diagnostics: WorkbenchPersistenceDiagnostic[];
  handled: boolean;
}

const fallbackSession = (): WorkbenchSessionState => ({
  version: 1,
  files: [],
  activeFileId: '',
  selectedPanel: 'preview',
  heatCapacityGuideSession: {
    fileId: null,
    strongReminderActive: false,
    strongReminderControlId: null,
  },
});

const createUnsupportedFutureDiagnostic = (
  schemaVersion: number,
): WorkbenchPersistenceDiagnostic => ({
  level: 'error',
  code: 'unsupported-future-version',
  message: `Unsupported future workbench schema version: ${schemaVersion}.`,
});

const encodeFileEnvelope = (
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
    visiblePanels: file.visiblePanels,
    liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
    ...(file.kind === 'standard' ? { standardResultsLayout: file.standardResultsLayout } : {}),
    ...(file.kind === 'ideal' ? { idealWindowLayout: file.idealWindowLayout } : {}),
    ...(file.kind === 'heatCapacity'
      ? {
          openHeatCapacityTabs: file.openHeatCapacityTabs,
          activeHeatCapacityTabId: file.activeHeatCapacityTabId,
        }
      : {}),
  },
  payload: (
    file.kind === 'heatCapacity'
      ? createHeatCapacityPersistencePayload(file, savedAt)
      : file.kind === 'standard'
        ? createStandardPersistencePayload(file, savedAt)
        : createIdealGasPersistencePayload(file, savedAt)
  ) as unknown as Record<string, unknown>,
});

export const encodeWorkbenchStorageEnvelope = (
  files: WorkbenchFileState[],
  activeFileId: string,
  selectedPanel: WorkbenchPanelKey,
  savedAt = Date.now(),
  heatCapacityGuideSession: WorkbenchSessionState['heatCapacityGuideSession'] = undefined,
): WorkbenchSessionEnvelopeV2 => ({
  schemaFamily: WORKBENCH_SESSION_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_SESSION_SCHEMA_VERSION,
  appVersion: 'development',
  savedAt,
  activeFileId: activeFileId || null,
  selectedPanel,
  files: files.map((file) => encodeFileEnvelope(file, savedAt)),
  ...(heatCapacityGuideSession ? { heatCapacityGuideSession } : {}),
});

export const encodeWorkbenchClosedFilesStorageEnvelope = (
  files: WorkbenchFileState[],
  savedAt = Date.now(),
): WorkbenchClosedFilesEnvelopeV1 => ({
  schemaFamily: WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_CLOSED_FILES_SCHEMA_VERSION,
  appVersion: 'development',
  savedAt,
  files: files.map((file) => encodeFileEnvelope(file, savedAt)),
});

const restoreStandardOrIdealRuntimeFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
): WorkbenchFileState[] => {
  const payload = fileEnvelope.payload;
  if (!isRecord(payload) || !isRecord(payload.runtimeState)) return [];
  const runtimeState = payload.runtimeState as unknown as WorkbenchFileState;
  if (
    (fileEnvelope.kind === 'standard' && runtimeState.kind !== 'standard') ||
    (fileEnvelope.kind === 'ideal' && runtimeState.kind !== 'ideal')
  ) {
    return [];
  }
  const restoredFile = {
    ...runtimeState,
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    hardSphereEngineSnapshot: normalizeHardSphereEngineSnapshot(
      'hardSphereEngineSnapshot' in runtimeState ? runtimeState.hardSphereEngineSnapshot : null,
    ),
  };
  return [restoredFile];
};

const restoreStandardFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  index: number,
): WorkbenchFileState[] => {
  if (fileEnvelope.kind !== 'standard') return [];
  if (validateStandardPersistencePayload(fileEnvelope.payload).valid) {
    return [restoreStandardFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index)];
  }
  return restoreStandardOrIdealRuntimeFile(fileEnvelope);
};

const restoreIdealGasFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  index: number,
): WorkbenchFileState[] => {
  if (fileEnvelope.kind !== 'ideal') return [];
  if (validateIdealGasPersistencePayload(fileEnvelope.payload).valid) {
    return [restoreIdealGasFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index)];
  }
  return restoreStandardOrIdealRuntimeFile(fileEnvelope);
};

const restoreHeatCapacityRuntimeFile = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  index: number,
): WorkbenchFileState[] => {
  if (fileEnvelope.kind !== 'heatCapacity') return [];
  if (!isRecord(fileEnvelope.payload)) {
    const fallback = createDefaultHeatCapacityFile(index);
    return [{
      ...fallback,
      id: fileEnvelope.id,
      name: fileEnvelope.name,
      createdAt: fileEnvelope.createdAt,
      updatedAt: fileEnvelope.updatedAt,
      lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    }];
  }
  return [restoreHeatCapacityFileFromPersistencePayload(fileEnvelope, fileEnvelope.payload, index)];
};

interface DecodedWorkbenchFiles {
  files: WorkbenchFileState[];
  diagnostics: WorkbenchPersistenceDiagnostic[];
}

const decodeFilesFromEnvelopes = (
  files: WorkbenchExperimentFileEnvelopeV1[],
): DecodedWorkbenchFiles => files.reduce<DecodedWorkbenchFiles>((decoded, fileEnvelope, index) => {
  try {
    const restoredFiles = fileEnvelope.kind === 'standard'
      ? restoreStandardFile(fileEnvelope, index + 1)
      : fileEnvelope.kind === 'ideal'
        ? restoreIdealGasFile(fileEnvelope, index + 1)
        : restoreHeatCapacityRuntimeFile(fileEnvelope, index + 1);
    if (restoredFiles.length === 0) {
      decoded.diagnostics.push({
        level: 'error',
        code: 'invalid-file',
        message: `Experiment file could not be restored: ${fileEnvelope.name}.`,
        fileId: fileEnvelope.id,
      });
      return decoded;
    }
    decoded.files.push(...restoredFiles);
  } catch (error) {
    console.error(`[Workbench] Failed to restore experiment file ${fileEnvelope.id}:`, error);
    decoded.diagnostics.push({
      level: 'error',
      code: 'invalid-file',
      message: `Experiment file could not be restored: ${fileEnvelope.name}.`,
      fileId: fileEnvelope.id,
    });
  }
  return decoded;
}, { files: [], diagnostics: [] });

const decodeEnvelopeAsRuntimeSession = (
  envelope: WorkbenchSessionEnvelopeV2,
  runtimeFiles = decodeFilesFromEnvelopes(envelope.files).files,
): WorkbenchSessionState => {
  const heatCapacityGuideSession = envelope.heatCapacityGuideSession
    ? {
        ...envelope.heatCapacityGuideSession,
        strongReminderControlId: envelope.heatCapacityGuideSession.strongReminderControlId ?? null,
      }
    : undefined;
  return {
    version: 1,
    files: runtimeFiles,
    activeFileId: runtimeFiles.some((file) => file.id === envelope.activeFileId)
      ? envelope.activeFileId ?? ''
      : runtimeFiles[0]?.id ?? '',
    selectedPanel: envelope.selectedPanel,
    heatCapacityGuideSession,
  };
};

export const decodeWorkbenchStorageEnvelope = (
  value: unknown,
): DecodeWorkbenchStorageResult => {
  if (isRecord(value) && value.schemaFamily === WORKBENCH_SESSION_SCHEMA_FAMILY) {
    const version = value.schemaVersion;
    if (typeof version === 'number' && version > WORKBENCH_SESSION_SCHEMA_VERSION) {
      return {
        session: fallbackSession(),
        diagnostics: [createUnsupportedFutureDiagnostic(version)],
        handled: true,
      };
    }
    if (isWorkbenchSessionEnvelope(value)) {
      const decodedFiles = decodeFilesFromEnvelopes(value.files);
      return {
        session: decodeEnvelopeAsRuntimeSession(value, decodedFiles.files),
        diagnostics: decodedFiles.diagnostics,
        handled: true,
      };
    }
    return {
      session: fallbackSession(),
      diagnostics: [{
        level: 'error',
        code: 'invalid-envelope',
        message: 'Workbench session envelope is invalid.',
      }],
      handled: true,
    };
  }
  return {
    session: fallbackSession(),
    diagnostics: [],
    handled: false,
  };
};

export const decodeWorkbenchClosedFilesStorageEnvelope = (
  value: unknown,
): DecodeWorkbenchClosedFilesStorageResult => {
  if (isRecord(value) && value.schemaFamily === WORKBENCH_CLOSED_FILES_SCHEMA_FAMILY) {
    const version = value.schemaVersion;
    if (typeof version === 'number' && version > WORKBENCH_CLOSED_FILES_SCHEMA_VERSION) {
      return {
        files: [],
        diagnostics: [createUnsupportedFutureDiagnostic(version)],
        handled: true,
      };
    }
    if (isWorkbenchClosedFilesEnvelope(value)) {
      const decodedFiles = decodeFilesFromEnvelopes(value.files);
      return {
        files: decodedFiles.files,
        diagnostics: decodedFiles.diagnostics,
        handled: true,
      };
    }
    return {
      files: [],
      diagnostics: [{
        level: 'error',
        code: 'invalid-envelope',
        message: 'Workbench closed-files envelope is invalid.',
      }],
      handled: true,
    };
  }
  return {
    files: [],
    diagnostics: [],
    handled: false,
  };
};
