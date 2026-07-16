const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXPORTER_BUNDLE_MANIFEST_SCHEMA_VERSION = 3;
const EXPORTER_LEGAL_INVENTORY_SCHEMA_VERSION = 2;
const EXPORTER_SOURCE_FILES = [
  'tools/exporter/hsl_exporter.py',
  'tools/exporter/professional_graph_style.py',
];
const EXPORTER_INVENTORY_POLICY_FILES = [
  'tools/exporter/inspect_frozen_bundle.py',
];
const ALLOWED_RUNTIME_COMPONENTS = new Set([
  'libffi',
  'microsoft-runtime',
  'openssl',
  'python-runtime',
]);

const getExporterBundlePathsForDirectory = (directory) => ({
  executable: path.join(directory, 'hsl-exporter.exe'),
  manifest: path.join(directory, 'hsl-exporter.manifest.json'),
  legalInventory: path.join(directory, 'hsl-exporter.legal.json'),
});

const getExporterBundlePaths = (rootDir) => getExporterBundlePathsForDirectory(
  path.join(rootDir, 'resources', 'exporter'),
);

const getExporterSourceVersion = (rootDir) => {
  const source = fs.readFileSync(path.join(rootDir, EXPORTER_SOURCE_FILES[0]), 'utf8');
  const match = source.match(/^EXPORTER_VERSION\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    throw new Error('Cannot read EXPORTER_VERSION from tools/exporter/hsl_exporter.py.');
  }
  return match[1];
};

const fingerprintFiles = (rootDir, relativePaths) => {
  const hash = crypto.createHash('sha256');
  for (const relativePath of relativePaths) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(rootDir, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
};

const getExporterSourceFingerprint = (rootDir) => fingerprintFiles(rootDir, EXPORTER_SOURCE_FILES);
const getExporterInventoryPolicyFingerprint = (rootDir) => (
  fingerprintFiles(rootDir, EXPORTER_INVENTORY_POLICY_FILES)
);

const sortJsonValue = (value) => {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJsonValue(value[key])]),
  );
};

const fingerprintJson = (value) => crypto
  .createHash('sha256')
  .update(JSON.stringify(sortJsonValue(value)))
  .digest('hex');

const createExporterSourceDescriptor = (rootDir) => ({
  exporterVersion: getExporterSourceVersion(rootDir),
  sourceFingerprint: getExporterSourceFingerprint(rootDir),
  sourceFiles: [...EXPORTER_SOURCE_FILES],
  inventoryPolicyFingerprint: getExporterInventoryPolicyFingerprint(rootDir),
});

const assertLicenseFile = (licenseFile, owner) => {
  if (
    !licenseFile ||
    typeof licenseFile.name !== 'string' ||
    typeof licenseFile.text !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(licenseFile.sha256 || '') ||
    crypto.createHash('sha256').update(licenseFile.text).digest('hex') !== licenseFile.sha256
  ) {
    throw new Error(`Exporter legal inventory has invalid license evidence for ${owner}.`);
  }
};

const assertDistributionRecord = (record, category) => {
  const owner = `${record?.name || 'unknown'} ${record?.version || ''}`.trim();
  if (
    !record ||
    typeof record.name !== 'string' ||
    typeof record.version !== 'string' ||
    typeof record.license !== 'string' ||
    !record.license.trim() ||
    /unknown/i.test(record.license) ||
    !Number.isSafeInteger(record.frozenEntryCount) ||
    record.frozenEntryCount < 1 ||
    !Array.isArray(record.sampleEntries) ||
    !Array.isArray(record.licenseFiles) ||
    record.licenseFiles.length < 1
  ) {
    throw new Error(`Exporter legal inventory has an incomplete ${category} record for ${owner}.`);
  }
  record.licenseFiles.forEach((licenseFile) => assertLicenseFile(licenseFile, owner));
};

const assertExporterLegalInventory = (inventory, sourceDescriptor) => {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
    throw new Error('Bundled exporter legal inventory must be an object.');
  }
  if (inventory.schemaVersion !== EXPORTER_LEGAL_INVENTORY_SCHEMA_VERSION) {
    throw new Error('Bundled exporter legal inventory schema is stale. Run npm run exporter:bundle.');
  }
  if (inventory.exporterSourceFingerprint !== sourceDescriptor.sourceFingerprint) {
    throw new Error('Bundled exporter legal inventory source fingerprint is stale. Run npm run exporter:bundle.');
  }
  if (!/^[a-f0-9]{64}$/u.test(inventory.archiveFingerprint || '')) {
    throw new Error('Bundled exporter archive fingerprint is invalid.');
  }
  if (
    !Number.isSafeInteger(inventory.archiveEntryCount) || inventory.archiveEntryCount < 1 ||
    !Number.isSafeInteger(inventory.pyzModuleCount) || inventory.pyzModuleCount < 1
  ) {
    throw new Error('Bundled exporter archive counts are invalid.');
  }
  const pythonRuntime = inventory.pythonRuntime;
  if (
    !pythonRuntime ||
    pythonRuntime.name !== 'CPython' ||
    typeof pythonRuntime.version !== 'string' ||
    typeof pythonRuntime.license !== 'string' ||
    /unknown/i.test(pythonRuntime.license) ||
    typeof pythonRuntime.source !== 'string'
  ) {
    throw new Error('Bundled exporter Python runtime notice is incomplete.');
  }
  assertLicenseFile(pythonRuntime.licenseFile, 'CPython runtime');
  if (!Array.isArray(inventory.runtimeLibraries) || inventory.runtimeLibraries.length < 1) {
    throw new Error('Bundled exporter runtime library inventory is empty.');
  }
  for (const runtimeLibrary of inventory.runtimeLibraries) {
    const evidence = runtimeLibrary?.licenseEvidence;
    if (
      !runtimeLibrary ||
      typeof runtimeLibrary.name !== 'string' ||
      !ALLOWED_RUNTIME_COMPONENTS.has(runtimeLibrary.component) ||
      !evidence ||
      evidence.owner !== pythonRuntime.name ||
      evidence.licenseFileName !== pythonRuntime.licenseFile.name ||
      evidence.sha256 !== pythonRuntime.licenseFile.sha256
    ) {
      throw new Error(`Bundled exporter runtime library has unknown ownership: ${runtimeLibrary?.name || 'unknown'}.`);
    }
  }
  if (!Array.isArray(inventory.frozenDistributions) || inventory.frozenDistributions.length < 1) {
    throw new Error('Bundled exporter frozen distribution inventory is empty.');
  }
  if (!Array.isArray(inventory.buildComponents) || inventory.buildComponents.length < 1) {
    throw new Error('Bundled exporter build-component inventory is empty.');
  }
  inventory.frozenDistributions.forEach((record) => assertDistributionRecord(record, 'frozen distribution'));
  inventory.buildComponents.forEach((record) => assertDistributionRecord(record, 'build component'));
  const uniqueRecords = new Set();
  for (const record of [...inventory.frozenDistributions, ...inventory.buildComponents]) {
    const key = `${record.name.toLocaleLowerCase('en-US')}@${record.version}`;
    if (uniqueRecords.has(key)) {
      throw new Error(`Bundled exporter legal inventory contains duplicate component ${key}.`);
    }
    uniqueRecords.add(key);
  }
  return inventory;
};

const createExporterExecutableDescriptor = (executablePath) => {
  const stat = fs.lstatSync(executablePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1) {
    throw new Error(`Bundled exporter executable is not a regular non-empty file: ${executablePath}`);
  }
  return {
    fileName: path.basename(executablePath),
    sizeBytes: stat.size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(executablePath)).digest('hex'),
  };
};

const createExporterBundleManifest = (
  rootDir,
  legalInventory,
  executablePath = getExporterBundlePaths(rootDir).executable,
) => {
  const sourceDescriptor = createExporterSourceDescriptor(rootDir);
  assertExporterLegalInventory(legalInventory, sourceDescriptor);
  return {
    schemaVersion: EXPORTER_BUNDLE_MANIFEST_SCHEMA_VERSION,
    ...sourceDescriptor,
    executable: createExporterExecutableDescriptor(executablePath),
    legalInventoryFingerprint: fingerprintJson(legalInventory),
    archiveFingerprint: legalInventory.archiveFingerprint,
    frozenDistributionCount: legalInventory.frozenDistributions.length,
    runtimeLibraryCount: legalInventory.runtimeLibraries.length,
  };
};

const inspectExporterLegalInventory = (rootDir, executablePath) => {
  const sourceDescriptor = createExporterSourceDescriptor(rootDir);
  const inspectorPath = path.join(rootDir, EXPORTER_INVENTORY_POLICY_FILES[0]);
  const result = spawnSync('python', [
    inspectorPath,
    '--executable', executablePath,
    '--source-fingerprint', sourceDescriptor.sourceFingerprint,
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Bundled exporter legal inventory inspection failed.');
  }
  const inventory = JSON.parse(result.stdout);
  return assertExporterLegalInventory(inventory, sourceDescriptor);
};

const readExporterBundleManifest = (paths) => {
  const { manifest } = paths;
  return JSON.parse(fs.readFileSync(manifest, 'utf8'));
};

const readExporterLegalInventory = (paths) => {
  const { legalInventory } = paths;
  return JSON.parse(fs.readFileSync(legalInventory, 'utf8'));
};

const runBundledExporterSelfCheck = (rootDir, executable) => {
  const result = spawnSync(executable, ['--self-check'], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Bundled exporter self-check failed.');
  }
  return JSON.parse(result.stdout);
};

const assertBundledExporterCurrent = (rootDir, paths = getExporterBundlePaths(rootDir)) => {
  for (const filePath of Object.values(paths)) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bundled exporter artifact is missing: ${filePath}`);
    }
  }

  const sourceDescriptor = createExporterSourceDescriptor(rootDir);
  const storedInventory = assertExporterLegalInventory(
    readExporterLegalInventory(paths),
    sourceDescriptor,
  );
  const actualInventory = inspectExporterLegalInventory(rootDir, paths.executable);
  if (fingerprintJson(storedInventory) !== fingerprintJson(actualInventory)) {
    throw new Error('Bundled exporter legal inventory does not match the executable. Run npm run exporter:bundle.');
  }
  const expected = createExporterBundleManifest(rootDir, storedInventory, paths.executable);
  const manifest = readExporterBundleManifest(paths);
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    throw new Error('Bundled exporter manifest is stale. Run npm run exporter:bundle.');
  }

  const selfCheck = runBundledExporterSelfCheck(rootDir, paths.executable);
  if (selfCheck.exporterVersion !== expected.exporterVersion) {
    throw new Error('Bundled exporter version does not match its source. Run npm run exporter:bundle.');
  }
  if (selfCheck.sourceFingerprint !== expected.sourceFingerprint) {
    throw new Error('Bundled exporter source fingerprint is stale. Run npm run exporter:bundle.');
  }
  return {
    ...selfCheck,
    archiveFingerprint: expected.archiveFingerprint,
    frozenDistributionCount: expected.frozenDistributionCount,
    runtimeLibraryCount: expected.runtimeLibraryCount,
  };
};

module.exports = {
  assertBundledExporterCurrent,
  assertExporterLegalInventory,
  createExporterBundleManifest,
  createExporterSourceDescriptor,
  getExporterBundlePaths,
  getExporterBundlePathsForDirectory,
  inspectExporterLegalInventory,
};
