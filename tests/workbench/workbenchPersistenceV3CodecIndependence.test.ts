import assert from 'node:assert/strict';
import {
  existsSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
} from 'node:path';
import {
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isIdentifier,
  preProcessFile,
} from 'typescript';

const codecDirectory = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'persistenceV3',
);
const legacyAdapterName = 'legacyV2Adapter.ts';
const currentCodecSources = readdirSync(codecDirectory)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => ({
    name,
    source: readFileSync(join(codecDirectory, name), 'utf8'),
  }));

const forbiddenLegacyModuleNames = [
  'workbenchStandardPersistence.ts',
  'workbenchIdealGasPersistence.ts',
  'workbenchHeatCapacityPersistence.ts',
  'workbenchPistonOscillationPersistence.ts',
  'workbenchPersistenceMigration.ts',
];
const forbiddenDependencyModuleNames = [
  ...forbiddenLegacyModuleNames,
  'workbenchHeatCapacityFreeRestoreNormalization.ts',
  'workbenchHeatCapacitySessionRestore.ts',
  'workbenchIndexedDbPersistence.ts',
  'workbenchLayoutCompatibility.ts',
  'workbenchPersistenceScheduler.ts',
];
const forbiddenBrowserStorageApiNames = [
  'indexedDB',
  'localStorage',
  'sessionStorage',
];
const forbiddenLegacyApiNames = [
  'createStandardPersistencePayload',
  'validateStandardPersistencePayload',
  'restoreStandardFileFromPersistencePayload',
  'createIdealGasPersistencePayload',
  'validateIdealGasPersistencePayload',
  'restoreIdealGasFileFromPersistencePayload',
  'createHeatCapacityPersistencePayload',
  'validateHeatCapacityPersistencePayload',
  'restoreHeatCapacityFileFromPersistencePayload',
  'createPistonOscillationPersistencePayload',
  'validatePistonOscillationPersistencePayload',
  'restorePistonOscillationFileFromPersistencePayload',
  'decodeWorkbenchStorageEnvelope',
];

const collectIdentifiers = (source: string, fileName: string) => {
  const identifiers = new Set<string>();
  const sourceFile = createSourceFile(
    fileName,
    source,
    ScriptTarget.Latest,
    true,
  );
  const visit = (node: Parameters<typeof forEachChild>[0]) => {
    if (isIdentifier(node)) identifiers.add(node.text);
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return identifiers;
};

for (const { name, source } of currentCodecSources) {
  const preprocessing = preProcessFile(source, true, true);
  const importedModuleNames = new Set(
    preprocessing.importedFiles.map((entry) => basename(entry.fileName)),
  );
  const identifiers = collectIdentifiers(source, name);
  for (const forbiddenName of forbiddenDependencyModuleNames) {
    assert.equal(
      importedModuleNames.has(forbiddenName),
      false,
      `${name} must not import persistence dependency ${forbiddenName}`,
    );
  }
  for (const forbiddenName of forbiddenLegacyApiNames) {
    assert.equal(
      identifiers.has(forbiddenName),
      false,
      `${name} must not reference legacy persistence API ${forbiddenName}`,
    );
  }
}

const sourceRoot = resolve(process.cwd(), 'src');
const dependencyClosure = new Set<string>();
const resolveLocalImport = (
  importingFile: string,
  specifier: string,
) => {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(importingFile), specifier);
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ].find(existsSync) ?? null;
};
const visitLocalDependencies = (filePath: string) => {
  const absolutePath = resolve(filePath);
  if (dependencyClosure.has(absolutePath)) return;
  dependencyClosure.add(absolutePath);
  const preprocessing = preProcessFile(
    readFileSync(absolutePath, 'utf8'),
    true,
    true,
  );
  for (const importedFile of preprocessing.importedFiles) {
    const resolvedImport = resolveLocalImport(
      absolutePath,
      importedFile.fileName,
    );
    if (
      resolvedImport !== null &&
      (
        resolvedImport === sourceRoot ||
        resolvedImport.startsWith(`${sourceRoot}\\`) ||
        resolvedImport.startsWith(`${sourceRoot}/`)
      )
    ) {
      visitLocalDependencies(resolvedImport);
    }
  }
};
const dependencyRootNames = [
  'projection.ts',
  'codecRegistry.ts',
  'workspaceCodec.ts',
  legacyAdapterName,
] as const;
for (const rootName of dependencyRootNames) {
  visitLocalDependencies(join(codecDirectory, rootName));
}
for (const rootName of dependencyRootNames) {
  assert.equal(
    dependencyClosure.has(resolve(join(codecDirectory, rootName))),
    true,
    `the independence traversal must include ${rootName}`,
  );
}
for (const filePath of dependencyClosure) {
  const relativePath = relative(sourceRoot, filePath)
    .replaceAll('\\', '/');
  const fileName = basename(filePath);
  assert.equal(
    forbiddenDependencyModuleNames.includes(fileName),
    false,
    `current V3 dependency closure must not include forbidden module ${relativePath}`,
  );
  assert.equal(
    fileName.endsWith('.tsx'),
    false,
    `current V3 dependency closure must not include UI module ${relativePath}`,
  );
  const identifiers = collectIdentifiers(
    readFileSync(filePath, 'utf8'),
    relativePath,
  );
  for (const forbiddenName of forbiddenLegacyApiNames) {
    assert.equal(
      identifiers.has(forbiddenName),
      false,
      `current V3 dependency closure must not reference ${forbiddenName} from ${relativePath}`,
    );
  }
  for (const forbiddenName of forbiddenBrowserStorageApiNames) {
    assert.equal(
      identifiers.has(forbiddenName),
      false,
      `current V3 dependency closure must not reference browser storage API ${forbiddenName} from ${relativePath}`,
    );
  }
}

const projectionSource = readFileSync(
  join(codecDirectory, 'projection.ts'),
  'utf8',
);
assert.ok(
  projectionSource.includes(
    "from '../../../domain/hardSphere/hardSphereSnapshotCodec.ts'",
  ),
  'the current V3 projection must use the domain snapshot codec',
);
assert.equal(
  projectionSource.includes("from '../workbenchHardSpherePersistence.ts'"),
  false,
  'the current V3 projection must not use the legacy workbench persistence path',
);
assert.ok(
  projectionSource.includes(
    "from '../workbenchHeatCapacityFreeAggregateCodec.ts'",
  ),
  'the current V3 projection must use the neutral Free aggregate codec',
);
assert.equal(
  projectionSource.includes(
    "from '../workbenchHeatCapacityFreeRestoreNormalization.ts'",
  ),
  false,
  'the current V3 projection must not use the legacy restore compatibility path',
);

const heatAggregateCodecSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'workbench',
    'workbenchHeatCapacityFreeAggregateCodec.ts',
  ),
  'utf8',
);
for (const forbiddenName of [
  ...forbiddenLegacyModuleNames,
  ...forbiddenLegacyApiNames,
  'workbenchHeatCapacityFreeRestoreNormalization.ts',
]) {
  assert.equal(
    heatAggregateCodecSource.includes(forbiddenName),
    false,
    `the neutral Free aggregate codec must not depend on ${forbiddenName}`,
  );
}

const hardSphereCodecSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'domain',
    'hardSphere',
    'hardSphereSnapshotCodec.ts',
  ),
  'utf8',
);
assert.equal(
  hardSphereCodecSource.includes('features/workbench'),
  false,
  'the domain HardSphere snapshot codec must not depend on workbench features',
);

const workspaceCodecSource = readFileSync(
  join(codecDirectory, 'workspaceCodec.ts'),
  'utf8',
);
assert.equal(
  workspaceCodecSource.includes('workbenchPersistenceSchema.ts'),
  false,
  'the current workspace codec must delegate legacy schema parsing to the adapter',
);
for (const { name, source } of currentCodecSources) {
  if (name === 'workspaceCodec.ts') continue;
  assert.equal(
    source.includes('legacyV2Adapter.ts'),
    false,
    `${name} must not depend on the legacy adapter`,
  );
}

console.log('workbenchPersistenceV3CodecIndependence tests passed');
