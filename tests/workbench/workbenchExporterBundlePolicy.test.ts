import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const afterPackSource = readFileSync(join(root, 'build', 'afterPack.cjs'), 'utf8');
const bundleSource = readFileSync(join(root, 'scripts', 'bundleExporter.cjs'), 'utf8');
const policySource = readFileSync(join(root, 'build', 'exporterBundlePolicy.cjs'), 'utf8');
const exporterSource = readFileSync(join(root, 'tools', 'exporter', 'hsl_exporter.py'), 'utf8');
const exporterGraphStyleSource = readFileSync(
  join(root, 'tools', 'exporter', 'professional_graph_style.py'),
  'utf8',
);
const inspectorSource = readFileSync(join(root, 'tools', 'exporter', 'inspect_frozen_bundle.py'), 'utf8');
const manifest = JSON.parse(
  readFileSync(join(root, 'resources', 'exporter', 'hsl-exporter.manifest.json'), 'utf8'),
) as {
  schemaVersion?: number;
  sourceFingerprint?: string;
  executable?: { fileName?: string; sizeBytes?: number; sha256?: string };
  archiveFingerprint?: string;
  frozenDistributionCount?: number;
  runtimeLibraryCount?: number;
};
const legalInventory = JSON.parse(
  readFileSync(join(root, 'resources', 'exporter', 'hsl-exporter.legal.json'), 'utf8'),
) as {
  schemaVersion?: number;
  archiveFingerprint?: string;
  archiveEntryCount?: number;
  pyzModuleCount?: number;
  pythonRuntime?: { name?: string; licenseFile?: { name?: string; sha256?: string } };
  frozenDistributions?: Array<{
    name?: string;
    license?: string;
    frozenEntryCount?: number;
    licenseFiles?: Array<{ name?: string; sha256?: string; text?: string }>;
  }>;
  buildComponents?: Array<{ name?: string; licenseFiles?: Array<{ text?: string }> }>;
  runtimeLibraries?: Array<{
    name?: string;
    component?: string;
    licenseEvidence?: { owner?: string; licenseFileName?: string; sha256?: string };
  }>;
};

for (const [scriptName, target] of [
  ['desktop:installer', 'nsis'],
  ['desktop:portable', 'portable'],
] as const) {
  const script = packageJson.scripts?.[scriptName] ?? '';
  const orderedSteps = [
    'npm run exporter:bundle',
    'npm run exporter:check',
    'npm run build',
    `node scripts/runElectronBuilder.cjs ${target}`,
  ];
  const positions = orderedSteps.map((step) => script.indexOf(step));
  assert.ok(positions.every((position) => position >= 0), `${scriptName} should contain every exporter and packaging gate`);
  assert.deepEqual(
    [...positions].sort((left, right) => left - right),
    positions,
    `${scriptName} should inventory the exporter before generating legal notices and packaging`,
  );
}

assert.match(afterPackSource, /assertBundledExporterCurrent\(context\.packager\.projectDir\)/, 'direct electron-builder runs should reject a stale bundled exporter');
assert.match(
  afterPackSource,
  /getExporterBundlePathsForDirectory\(path\.join\(context\.appOutDir, 'resources', 'exporter'\)\)/,
  'afterPack should validate the exporter copy that actually entered appOutDir',
);
assert.match(bundleSource, /HSL_EXPORTER_SOURCE_FINGERPRINT/, 'PyInstaller should embed the current exporter source fingerprint');
assert.match(bundleSource, /inspectExporterLegalInventory\(rootDir, builtExe\)/, 'bundle generation should inspect the executable that PyInstaller actually produced');
assert.match(bundleSource, /targetPaths\.legalInventory/, 'bundle generation should persist the inspected legal inventory');
assert.match(bundleSource, /finally[\s\S]*?rmSync\(distDir[\s\S]*?rmSync\(buildDir/, 'exporter builds should clean temporary output directories');
assert.match(policySource, /selfCheck\.sourceFingerprint !== expected\.sourceFingerprint/, 'exporter policy should compare the executable fingerprint with current source');
assert.match(policySource, /inspectExporterLegalInventory\(rootDir, paths\.executable\)/, 'exporter policy should independently inspect the packaged executable');
assert.match(policySource, /fingerprintJson\(storedInventory\) !== fingerprintJson\(actualInventory\)/, 'exporter policy should reject an inventory that differs from the executable');
assert.match(policySource, /createExporterExecutableDescriptor[\s\S]*sizeBytes: stat\.size[\s\S]*createHash\('sha256'\)/, 'exporter manifests should bind the exact executable size and SHA-256');
assert.match(policySource, /EXPORTER_INVENTORY_POLICY_FILES/, 'changes to the frozen-archive ownership policy should invalidate the bundle manifest');
assert.match(exporterSource, /EXPORTER_SOURCE_FINGERPRINT = os\.environ\.get/, 'exporter self-check should report its embedded source fingerprint');
assert.match(exporterSource, /Gas Laws Lab Export Report/, 'exported reports should use the current English brand');
assert.match(exporterSource, /Gas Laws Lab local exporter/, 'the exporter command description should use the current English brand');
assert.doesNotMatch(exporterSource, /Hard Sphere Lab/, 'the exporter should not expose the retired English brand');
assert.doesNotMatch(exporterGraphStyleSource, /Hard Sphere Lab/, 'exporter helper modules should not expose the retired English brand');
assert.match(inspectorSource, /CArchiveReader/, 'the legal inventory should be derived from the actual PyInstaller archive');
assert.match(inspectorSource, /archive\.open_embedded_archive\(pyz_name/, 'the legal inventory should inspect embedded PYZ modules');

assert.equal(manifest.schemaVersion, 3, 'exporter bundle manifest should use the executable-integrity schema');
assert.equal(legalInventory.schemaVersion, 2, 'exporter legal inventory should use the hashed runtime-evidence schema');
const exporterExecutablePath = join(root, 'resources', 'exporter', 'hsl-exporter.exe');
const exporterExecutable = readFileSync(exporterExecutablePath);
assert.equal(manifest.executable?.fileName, 'hsl-exporter.exe');
assert.equal(manifest.executable?.sizeBytes, statSync(exporterExecutablePath).size);
assert.equal(manifest.executable?.sha256, createHash('sha256').update(exporterExecutable).digest('hex'));
assert.match(legalInventory.archiveFingerprint ?? '', /^[a-f0-9]{64}$/);
assert.equal(manifest.archiveFingerprint, legalInventory.archiveFingerprint);
assert.ok((legalInventory.archiveEntryCount ?? 0) > 0, 'frozen archive should contain inspected top-level entries');
assert.ok((legalInventory.pyzModuleCount ?? 0) > 0, 'frozen archive should contain inspected PYZ modules');
assert.equal(manifest.frozenDistributionCount, legalInventory.frozenDistributions?.length);
assert.equal(manifest.runtimeLibraryCount, legalInventory.runtimeLibraries?.length);

const frozenNames = new Set((legalInventory.frozenDistributions ?? []).map((record) => record.name));
for (const expectedName of ['matplotlib', 'numpy', 'pillow', 'reportlab']) {
  assert.ok(frozenNames.has(expectedName), `actual frozen distribution inventory should include ${expectedName}`);
}
const buildComponentNames = new Set((legalInventory.buildComponents ?? []).map((record) => record.name));
assert.ok(buildComponentNames.has('pyinstaller'), 'actual bundle inventory should include its PyInstaller build component');
const runtimeComponents = new Set((legalInventory.runtimeLibraries ?? []).map((record) => record.component));
assert.deepEqual(
  [...runtimeComponents].sort(),
  ['libffi', 'microsoft-runtime', 'openssl', 'python-runtime'],
  'runtime library ownership should be complete and fail closed',
);
for (const record of legalInventory.frozenDistributions ?? []) {
  assert.ok((record.frozenEntryCount ?? 0) > 0, `${record.name ?? 'unknown'} should have frozen-entry evidence`);
  assert.doesNotMatch(record.license ?? '', /unknown/i, `${record.name ?? 'unknown'} should have a known license`);
  assert.ok((record.licenseFiles?.length ?? 0) > 0, `${record.name ?? 'unknown'} should include full license evidence`);
  for (const licenseFile of record.licenseFiles ?? []) {
    assert.match(licenseFile.sha256 ?? '', /^[a-f0-9]{64}$/, `${record.name ?? 'unknown'} license text should be hashed`);
    assert.ok((licenseFile.text?.length ?? 0) > 0, `${record.name ?? 'unknown'} license text should not be empty`);
  }
}
for (const runtimeLibrary of legalInventory.runtimeLibraries ?? []) {
  assert.equal(runtimeLibrary.licenseEvidence?.owner, legalInventory.pythonRuntime?.name);
  assert.equal(
    runtimeLibrary.licenseEvidence?.licenseFileName,
    legalInventory.pythonRuntime?.licenseFile?.name,
  );
  assert.equal(
    runtimeLibrary.licenseEvidence?.sha256,
    legalInventory.pythonRuntime?.licenseFile?.sha256,
    `${runtimeLibrary.name ?? 'unknown runtime'} should bind to the exact hashed CPython Windows notice evidence`,
  );
}

const inspectWithHashSeed = (seed: string) => {
  const result = spawnSync('python', [
    join(root, 'tools', 'exporter', 'inspect_frozen_bundle.py'),
    '--executable', join(root, 'resources', 'exporter', 'hsl-exporter.exe'),
    '--source-fingerprint', manifest.sourceFingerprint ?? '',
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONHASHSEED: seed },
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr || `inventory inspection should pass with PYTHONHASHSEED=${seed}`);
  return result.stdout;
};
const seededInventories = ['1', '2', '8675309'].map(inspectWithHashSeed);
assert.equal(
  new Set(seededInventories).size,
  1,
  'frozen exporter inventory must be byte-for-byte deterministic across Python hash seeds',
);

console.log('workbenchExporterBundlePolicy tests passed');
