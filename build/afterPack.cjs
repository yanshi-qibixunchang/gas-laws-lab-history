const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const rceditPath = path.join(context.packager.projectDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
  const iconPath = path.join(context.packager.projectDir, 'resources', 'app-icon', 'icon.ico');
  const version = context.packager.appInfo.version;
  const productName = context.packager.appInfo.productName;

  execFileSync(rceditPath, [
    exePath,
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
    `${productName}.exe`,
    '--set-file-version',
    version,
    '--set-product-version',
    version,
  ], { stdio: 'inherit' });
};
