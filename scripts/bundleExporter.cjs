const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertBundledExporterCurrent,
  createExporterBundleManifest,
  createExporterSourceDescriptor,
  getExporterBundlePaths,
  inspectExporterLegalInventory,
} = require('../build/exporterBundlePolicy.cjs');

const rootDir = path.resolve(__dirname, '..');
const exporterScript = path.join(rootDir, 'tools', 'exporter', 'hsl_exporter.py');
const resourcesDir = path.join(rootDir, 'resources', 'exporter');
const distDir = path.join(rootDir, 'dist-exporter');
const buildDir = path.join(rootDir, 'build-exporter');

const main = () => {
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });

  const pyinstallerCheck = spawnSync('python', ['-m', 'PyInstaller', '--version'], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (pyinstallerCheck.status !== 0) {
    throw new Error('PyInstaller is required to build the bundled exporter.');
  }

  const sourceDescriptor = createExporterSourceDescriptor(rootDir);
  const runtimeHookPath = path.join(buildDir, 'hsl_exporter_build_info.py');
  fs.writeFileSync(
    runtimeHookPath,
    `import os\nos.environ["HSL_EXPORTER_SOURCE_FINGERPRINT"] = "${sourceDescriptor.sourceFingerprint}"\n`,
    'utf8',
  );

  const result = spawnSync('python', [
    '-m',
    'PyInstaller',
    '--log-level',
    'WARN',
    '--onefile',
    '--clean',
    '--noconfirm',
    '--name',
    'hsl-exporter',
    '--runtime-hook',
    runtimeHookPath,
    '--hidden-import',
    'matplotlib.backends.backend_pdf',
    '--hidden-import',
    'matplotlib.backends.backend_agg',
    '--distpath',
    distDir,
    '--workpath',
    buildDir,
    '--specpath',
    buildDir,
    exporterScript,
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(detail || `PyInstaller failed with exit code ${result.status || 1}.`);
  }

  const builtExe = path.join(distDir, 'hsl-exporter.exe');
  if (!fs.existsSync(builtExe)) {
    throw new Error(`Expected PyInstaller output was not found: ${builtExe}`);
  }

  const targetPaths = getExporterBundlePaths(rootDir);
  const legalInventory = inspectExporterLegalInventory(rootDir, builtExe);
  const manifest = createExporterBundleManifest(rootDir, legalInventory, builtExe);
  fs.copyFileSync(builtExe, targetPaths.executable);
  fs.writeFileSync(targetPaths.legalInventory, `${JSON.stringify(legalInventory, null, 2)}\n`, 'utf8');
  fs.writeFileSync(targetPaths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const selfCheck = assertBundledExporterCurrent(rootDir);
  console.log(`Bundled exporter ${selfCheck.exporterVersion} written to ${targetPaths.executable}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.rmSync(buildDir, { recursive: true, force: true });
}
