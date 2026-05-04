const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const exporterScript = path.join(rootDir, 'tools', 'exporter', 'hsl_exporter.py');
const resourcesDir = path.join(rootDir, 'resources', 'exporter');
const distDir = path.join(rootDir, 'dist-exporter');
const buildDir = path.join(rootDir, 'build-exporter');

fs.mkdirSync(resourcesDir, { recursive: true });

const pyinstallerCheck = spawnSync('python', ['-m', 'PyInstaller', '--version'], {
  cwd: rootDir,
  encoding: 'utf8',
  windowsHide: true,
});

if (pyinstallerCheck.status !== 0) {
  console.error('PyInstaller is required to build the bundled exporter.');
  console.error('Install it with: python -m pip install pyinstaller');
  process.exit(pyinstallerCheck.status || 1);
}

const result = spawnSync('python', [
  '-m',
  'PyInstaller',
  '--onefile',
  '--clean',
  '--noconfirm',
  '--name',
  'hsl-exporter',
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
  stdio: 'inherit',
  windowsHide: true,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const builtExe = path.join(distDir, 'hsl-exporter.exe');
const targetExe = path.join(resourcesDir, 'hsl-exporter.exe');

if (!fs.existsSync(builtExe)) {
  console.error(`Expected PyInstaller output was not found: ${builtExe}`);
  process.exit(1);
}

fs.copyFileSync(builtExe, targetExe);
console.log(`Bundled exporter written to ${targetExe}`);
