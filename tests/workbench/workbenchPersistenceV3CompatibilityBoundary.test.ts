import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
} from 'node:fs';
import {
  join,
} from 'node:path';
import {
  WORKBENCH_PERSISTENCE_LEGACY_SUPPORT_MATRIX,
  classifyWorkbenchFileSchema,
  classifyWorkbenchWorkspaceSchema,
} from '../../src/features/workbench/persistenceV3/compat/legacySupportMatrix.ts';

const persistenceDirectory = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'persistenceV3',
);
const compatibilityDirectory = join(persistenceDirectory, 'compat');
const workspaceCodecSource = readFileSync(
  join(persistenceDirectory, 'workspaceCodec.ts'),
  'utf8',
);
const productionFacadeSource = readFileSync(
  join(persistenceDirectory, 'productionFacade.ts'),
  'utf8',
);

assert.equal(
  workspaceCodecSource.includes('legacyV2Adapter'),
  false,
  'the current V3 workspace codec must not statically load the legacy adapter',
);
assert.equal(
  workspaceCodecSource.includes('decodeLegacyWorkbench'),
  false,
  'the current V3 workspace codec must not dispatch legacy schemas',
);
assert.equal(
  productionFacadeSource.includes('/compat/') ||
    productionFacadeSource.includes("from './compat"),
  false,
  'ordinary production V3 restore must remain outside the legacy compatibility boundary',
);
assert.equal(
  existsSync(compatibilityDirectory),
  true,
  'legacy workspace support must live in a dedicated compatibility directory',
);
assert.equal(
  existsSync(join(compatibilityDirectory, 'legacySupportMatrix.ts')),
  true,
  'the compatibility boundary must publish a machine-readable support matrix',
);
assert.equal(
  existsSync(join(compatibilityDirectory, 'workspaceCompatibilityDecoder.ts')),
  true,
  'mixed-age and legacy workspace decoding must use a dedicated compatibility entrypoint',
);
assert.deepEqual(
  WORKBENCH_PERSISTENCE_LEGACY_SUPPORT_MATRIX.migrationBaselineVersion,
  1,
  'legacy migration semantics must have an explicit baseline version',
);
assert.deepEqual(
  WORKBENCH_PERSISTENCE_LEGACY_SUPPORT_MATRIX.workspace,
  {
    schemaFamily: 'hard-sphere-lab.workbench-session',
    supportedSchemaVersions: [2],
  },
  'the supported legacy workspace family and version must remain explicit',
);
assert.deepEqual(
  WORKBENCH_PERSISTENCE_LEGACY_SUPPORT_MATRIX.fileEnvelope,
  {
    schemaFamily: 'hard-sphere-lab.experiment-file',
    supportedSchemaVersions: [1],
  },
  'the supported legacy file-envelope family and version must remain explicit',
);
assert.equal(
  classifyWorkbenchWorkspaceSchema({
    schemaFamily: 'hard-sphere-lab.workbench-session',
    schemaVersion: 2,
  }),
  'legacy-family',
);
assert.equal(
  classifyWorkbenchFileSchema({
    schemaFamily: 'hard-sphere-lab.experiment-file',
    fileSchemaVersion: 1,
  }),
  'legacy-family',
);
assert.equal(
  classifyWorkbenchWorkspaceSchema({
    schemaFamily: 'unknown.workspace',
    schemaVersion: 2,
  }),
  'unknown',
  'unknown schema families must not be sent through legacy migration',
);

console.log('workbenchPersistenceV3CompatibilityBoundary tests passed');
