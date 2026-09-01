import {
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
  createWorkbenchPersistenceV3Success,
  type WorkbenchPersistenceV3DecodeResult,
} from '../contract.ts';
import {
  decodeWorkbenchPersistenceV3WorkspaceRecord,
  type WorkbenchPersistenceV3ForeignFileDecoder,
  type WorkbenchPersistenceV3WorkspaceProjection,
  type WorkbenchPersistenceV3WorkspaceRecord,
} from '../workspaceCodec.ts';
import {
  decodeLegacyWorkbenchFileEnvelopeToV3Projection,
  decodeLegacyWorkbenchWorkspaceSource,
} from './legacyV2Adapter.ts';
import {
  classifyWorkbenchFileSchema,
  classifyWorkbenchWorkspaceSchema,
} from './legacySupportMatrix.ts';
import {
  decodeCompatibleWorkbenchV3FileRecord,
} from './legacyV3ProjectionAdapter.ts';

const createLegacyFileDecoder = (
  sourceAppVersion?: string,
): WorkbenchPersistenceV3ForeignFileDecoder => (
  raw,
  index,
) => classifyWorkbenchFileSchema(raw) === 'legacy-family'
  ? decodeLegacyWorkbenchFileEnvelopeToV3Projection(
      raw,
      index,
      { sourceAppVersion },
    )
  : null;

export const decodeCompatibleWorkbenchWorkspaceRecord = (
  raw: unknown,
): WorkbenchPersistenceV3DecodeResult<WorkbenchPersistenceV3WorkspaceProjection> => {
  const schemaClass = classifyWorkbenchWorkspaceSchema(raw);
  if (schemaClass === 'current-v3') {
    return decodeWorkbenchPersistenceV3WorkspaceRecord(raw, {
      decodeCurrentFileRecord: decodeCompatibleWorkbenchV3FileRecord,
      decodeForeignFileRecord: createLegacyFileDecoder(),
    });
  }
  if (schemaClass !== 'legacy-family') {
    return decodeWorkbenchPersistenceV3WorkspaceRecord(raw);
  }

  const legacySource = decodeLegacyWorkbenchWorkspaceSource(raw);
  if (legacySource.ok === false) return legacySource;
  const currentEnvelope: WorkbenchPersistenceV3WorkspaceRecord = {
    schemaFamily: WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
    schemaVersion: WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
    capturedAtMs: legacySource.value.capturedAtMs,
    manifest: {
      activeFileId: legacySource.value.activeFileId,
      selectedPanel: legacySource.value.selectedPanel,
      fileOrder: [...legacySource.value.fileOrder],
    },
    records: [...legacySource.value.records],
  };
  const decoded = decodeWorkbenchPersistenceV3WorkspaceRecord(
    currentEnvelope,
    {
      decodeCurrentFileRecord: decodeCompatibleWorkbenchV3FileRecord,
      decodeForeignFileRecord: createLegacyFileDecoder(
        legacySource.value.sourceAppVersion,
      ),
    },
  );
  if (decoded.ok === false) return decoded;
  return createWorkbenchPersistenceV3Success(
    'migrated',
    decoded.value,
    [...legacySource.diagnostics, ...decoded.diagnostics],
  );
};
