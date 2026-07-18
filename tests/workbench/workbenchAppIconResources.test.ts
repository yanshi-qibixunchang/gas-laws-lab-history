import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
require('../../scripts/verifyAppIconResources.cjs');

const generatorSource = readFileSync(
  join(process.cwd(), 'scripts', 'generateAppIcons.cjs'),
  'utf8',
);
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
) as {
  build: {
    afterPack: string;
    extraResources: Array<{ from: string; to: string }>;
    win: { icon: string };
    nsis: {
      installerIcon: string;
      uninstallerIcon: string;
      createDesktopShortcut: boolean;
      createStartMenuShortcut: boolean;
    };
  };
};
const afterPackSource = readFileSync(
  join(process.cwd(), 'build', 'afterPack.cjs'),
  'utf8',
);
const electronMainSource = readFileSync(
  join(process.cwd(), 'electron', 'main.cjs'),
  'utf8',
);
assert.match(
  generatorSource,
  /padImageToSquareWithoutCropping[\s\S]*Math\.max\(width, height\)[\s\S]*Buffer\.alloc\(side \* side \* 4\)[\s\S]*sourceBitmap\.copy/,
  'a non-square user icon must be placed intact on a transparent square canvas',
);
assert.match(
  generatorSource,
  /const squareSourceImage = padImageToSquareWithoutCropping\(sourceImage\)[\s\S]*createPng\(squareSourceImage/,
  'all generated icon sizes must use the non-cropping square canvas',
);
assert.doesNotMatch(
  generatorSource,
  /\.crop\(|clipPath|extract\(/,
  'icon generation must not crop the user-provided artwork',
);
assert.equal(packageJson.build.afterPack, 'build/afterPack.cjs');
assert.equal(packageJson.build.win.icon, 'resources/app-icon/icon.ico');
assert.equal(packageJson.build.nsis.installerIcon, 'resources/app-icon/icon.ico');
assert.equal(packageJson.build.nsis.uninstallerIcon, 'resources/app-icon/icon.ico');
assert.equal(packageJson.build.nsis.createDesktopShortcut, true);
assert.equal(packageJson.build.nsis.createStartMenuShortcut, true);
assert.equal(
  packageJson.build.extraResources.some((resource) => (
    resource.from === 'resources/app-icon' && resource.to === 'app-icon'
  )),
  true,
  'the packaged app must include the canonical app-icon resource directory',
);
assert.match(
  afterPackSource,
  /path\.join\(context\.packager\.projectDir, 'resources', 'app-icon', 'icon\.ico'\)[\s\S]*'--set-icon',[\s\S]*iconPath/,
  'afterPack must embed the canonical ICO into the executable used by Windows shortcuts',
);
assert.match(
  afterPackSource,
  /const companyName = context\.packager\.appInfo\.companyName \|\| productName[\s\S]*'CompanyName',[\s\S]*companyName/,
  'afterPack must replace Electron default CompanyName metadata',
);
assert.match(
  afterPackSource,
  /const legalCopyright = context\.packager\.appInfo\.copyright[\s\S]*'LegalCopyright',[\s\S]*legalCopyright/,
  'afterPack must replace Electron default copyright metadata',
);
assert.match(
  electronMainSource,
  /getAppIconPath[\s\S]*process\.resourcesPath \|\| '', 'app-icon', 'icon\.ico'[\s\S]*rootDir, 'resources', 'app-icon', 'icon\.ico'/,
  'Electron must resolve the canonical ICO in both packaged and development runtimes',
);
assert.match(
  electronMainSource,
  /new BrowserWindow\(\{[\s\S]*icon: getAppIconPath\(\)/,
  'desktop windows must use the canonical packaged icon',
);

console.log('workbenchAppIconResources tests passed');
