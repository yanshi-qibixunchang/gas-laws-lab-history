const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXPORTER_BUNDLE_MANIFEST_SCHEMA_VERSION = 1;
const EXPORTER_SOURCE_FILES = [
  'tools/exporter/hsl_exporter.py',
  'tools/exporter/professional_graph_style.py',
];

const getExporterBundlePaths = (rootDir) => ({
  executable: path.join(rootDir, 'resources', 'exporter', 'hsl-exporter.exe'),
  manifest: path.join(rootDir, 'resources', 'exporter', 'hsl-exporter.manifest.json'),
});

const getExporterSourceVersion = (rootDir) => {
  const source = fs.readFileSync(path.join(rootDir, EXPORTER_SOURCE_FILES[0]), 'utf8');
  const match = source.match(/^EXPORTER_VERSION\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    throw new Error('Cannot read EXPORTER_VERSION from tools/exporter/hsl_exporter.py.');
  }
  return match[1];
};

const getExporterSourceFingerprint = (rootDir) => {
  const hash = crypto.createHash('sha256');
  for (const relativePath of EXPORTER_SOURCE_FILES) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(rootDir, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
};

const createExporterBundleManifest = (rootDir) => ({
  schemaVersion: EXPORTER_BUNDLE_MANIFEST_SCHEMA_VERSION,
  exporterVersion: getExporterSourceVersion(rootDir),
  sourceFingerprint: getExporterSourceFingerprint(rootDir),
  sourceFiles: [...EXPORTER_SOURCE_FILES],
});

const readExporterBundleManifest = (rootDir) => {
  const { manifest } = getExporterBundlePaths(rootDir);
  return JSON.parse(fs.readFileSync(manifest, 'utf8'));
};

const runBundledExporterSelfCheck = (rootDir) => {
  const { executable } = getExporterBundlePaths(rootDir);
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

const assertBundledExporterCurrent = (rootDir) => {
  const paths = getExporterBundlePaths(rootDir);
  if (!fs.existsSync(paths.executable)) {
    throw new Error(`Bundled exporter is missing: ${paths.executable}`);
  }
  if (!fs.existsSync(paths.manifest)) {
    throw new Error(`Bundled exporter manifest is missing: ${paths.manifest}`);
  }

  const expected = createExporterBundleManifest(rootDir);
  const manifest = readExporterBundleManifest(rootDir);
  for (const key of ['schemaVersion', 'exporterVersion', 'sourceFingerprint']) {
    if (manifest[key] !== expected[key]) {
      throw new Error(`Bundled exporter manifest ${key} is stale. Run npm run exporter:bundle.`);
    }
  }
  if (JSON.stringify(manifest.sourceFiles) !== JSON.stringify(expected.sourceFiles)) {
    throw new Error('Bundled exporter source file manifest is stale. Run npm run exporter:bundle.');
  }

  const selfCheck = runBundledExporterSelfCheck(rootDir);
  if (selfCheck.exporterVersion !== expected.exporterVersion) {
    throw new Error('Bundled exporter version does not match its source. Run npm run exporter:bundle.');
  }
  if (selfCheck.sourceFingerprint !== expected.sourceFingerprint) {
    throw new Error('Bundled exporter source fingerprint is stale. Run npm run exporter:bundle.');
  }
  return selfCheck;
};

module.exports = {
  EXPORTER_BUNDLE_MANIFEST_SCHEMA_VERSION,
  EXPORTER_SOURCE_FILES,
  assertBundledExporterCurrent,
  createExporterBundleManifest,
  getExporterBundlePaths,
  getExporterSourceFingerprint,
  getExporterSourceVersion,
};
