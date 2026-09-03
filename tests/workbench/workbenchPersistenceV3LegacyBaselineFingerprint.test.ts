import assert from 'node:assert/strict';
import {
  createHash,
} from 'node:crypto';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  decodeCompatibleWorkbenchWorkspaceRecord,
} from '../../src/features/workbench/persistenceV3/compat/workspaceCompatibilityDecoder.ts';
import {
  createLegacyWorkbenchFileEnvelopeFixture,
} from './helpers/legacyWorkbenchSourceFixture.ts';

const FIXED_TIME_MS = 1_721_000_000_000;
const files = [
  createDefaultStandardFile(1),
  createDefaultIdealFile(2),
  createDefaultHeatCapacityFile(3),
  createDefaultHeatCapacityPistonOscillationFile(4),
].map((file, index): WorkbenchFileState => ({
  ...file,
  createdAt: FIXED_TIME_MS + index,
  updatedAt: FIXED_TIME_MS + index,
  lastOpenedAt: FIXED_TIME_MS + index,
} as WorkbenchFileState));
const legacyWorkspace = {
  schemaFamily: 'hard-sphere-lab.workbench-session',
  schemaVersion: 2,
  appVersion: '6.4.0-compatibility-baseline',
  savedAt: FIXED_TIME_MS + 100,
  activeFileId: files[0]!.id,
  selectedPanel: 'preview',
  files: files.map((file, index) => (
    createLegacyWorkbenchFileEnvelopeFixture(
      file,
      FIXED_TIME_MS + index,
    )
  )),
};
const decoded = decodeCompatibleWorkbenchWorkspaceRecord(legacyWorkspace);
assert.equal(decoded.ok, true);
if (!decoded.ok) throw new Error(decoded.diagnostics[0]?.message);
assert.equal(decoded.status, 'migrated');

const normalizeForBaseline = (value: unknown, key = ''): unknown => {
  if (
    typeof value === 'number' &&
    /(?:^|_)(?:captured|saved|created|updated|lastOpened|measured)AtMs$|^(?:createdAt|updatedAt|lastOpenedAt)$/.test(key)
  ) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForBaseline(entry));
  }
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([entryKey, entryValue]) => [
        entryKey,
        normalizeForBaseline(entryValue, entryKey),
      ]),
  );
};
const migratedValues = decoded.value.entries.map((entry) => (
  entry.kind === 'decoded'
    ? entry.projection
    : {
        kind: entry.kind,
        fileId: entry.fileId,
        status: entry.status,
        raw: entry.raw,
      }
));
const baselineHash = createHash('sha256')
  .update(JSON.stringify(normalizeForBaseline(migratedValues)))
  .digest('hex');

assert.equal(
  baselineHash,
  '5a52f30c4096854dfe64877e40984bb08c145ef1e3004e772ca39cec6a078ca7',
  'legacy migration output changed; review the compatibility support matrix and bump its baseline deliberately',
);

console.log('workbenchPersistenceV3LegacyBaselineFingerprint tests passed');
