const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertBundledExporterCurrent,
} = require('./exporterBundlePolicy.cjs');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  assertBundledExporterCurrent(context.packager.projectDir);

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const rceditTargetPath = path.join(context.appOutDir, 'hsl-rcedit-target.exe');
  const rceditPath = path.join(context.packager.projectDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
  const iconPath = path.join(context.packager.projectDir, 'resources', 'app-icon', 'icon.ico');
  const version = context.packager.appInfo.version;
  const productName = context.packager.appInfo.productName;
  const originalFilename = `${context.packager.appInfo.productFilename}.exe`;

  const targetPath = exePath === rceditTargetPath ? exePath : rceditTargetPath;
  if (targetPath !== exePath) {
    fs.rmSync(targetPath, { force: true });
    fs.renameSync(exePath, targetPath);
  }

  try {
    execFileSync(rceditPath, [
      targetPath,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'FileDescription',
      productName,
      '--set-version-string',
      'ProductName',
      productName,
      '--set-version-string',
      'InternalName',
      productName,
      '--set-version-string',
      'OriginalFilename',
      originalFilename,
      '--set-file-version',
      version,
      '--set-product-version',
      version,
    ], { stdio: 'inherit' });
  } finally {
    if (targetPath !== exePath && fs.existsSync(targetPath)) {
      fs.rmSync(exePath, { force: true });
      fs.renameSync(targetPath, exePath);
    }
  }
};
