import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  build?: {
    productName?: string;
    nsis?: {
      displayLanguageSelector?: boolean;
      installerLanguages?: string[];
      language?: string;
      shortcutName?: string;
    };
  };
};
const electronMain = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const webManifest = readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8');
const installerNsh = readFileSync(new URL('../../build/installer.nsh', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');

const indexOfOrFail = (haystack: string, needle: string, message: string) => {
  const index = haystack.indexOf(needle);
  assert.notEqual(index, -1, message);
  return index;
};

assert.equal(packageJson.build?.productName, '热容比实验室', 'installer product name should use the Chinese app name');
assert.equal(packageJson.build?.nsis?.shortcutName, '热容比实验室', 'Windows shortcut should use the Chinese app name');
assert.equal(packageJson.build?.nsis?.displayLanguageSelector, false, 'NSIS installer should not show a startup language selector');
assert.equal(packageJson.build?.nsis?.installerLanguages, undefined, 'NSIS installer should not offer a startup language list');
assert.equal(packageJson.build?.nsis?.language, '2052', 'NSIS installer metadata should default to Simplified Chinese');
assert.ok(installerNsh.includes('!define HSL_RemoveUserDataPrompt "是否删除热容比实验室的用户数据和缓存？'), 'manual uninstaller prompt should define fixed Simplified Chinese text');
assert.ok(!installerNsh.includes('LangString HSL_RemoveUserDataPrompt'), 'manual uninstaller prompt should not depend on the NSIS language table');
assert.ok(installerNsh.includes('!macro customUnInstall'), 'custom uninstall hook should keep the manual data-removal prompt');
const updateSkipIndex = indexOfOrFail(installerNsh, '${GetOptions} $R0 "--updated" $R1', 'uninstaller should detect update-driven uninstall runs');
const keepDataSkipIndex = indexOfOrFail(installerNsh, '${GetOptions} $R0 "/KEEP_APP_DATA" $R1', 'uninstaller should detect updater keep-data runs');
const silentSkipIndex = indexOfOrFail(installerNsh, '${If} ${Silent}', 'silent uninstall runs should not show a blocking prompt');
const promptIndex = indexOfOrFail(installerNsh, 'MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "${HSL_RemoveUserDataPrompt}"', 'manual uninstall should ask whether to remove user data');
assert.ok(updateSkipIndex < promptIndex, 'update-driven uninstall should skip before the manual data-removal prompt');
assert.ok(keepDataSkipIndex < promptIndex, 'keep-data update calls should skip before the manual data-removal prompt');
assert.ok(silentSkipIndex < promptIndex, 'silent uninstall should skip before the manual data-removal prompt');
assert.ok(installerNsh.includes('RMDir /r "$APPDATA\\hard-sphere-lab"'), 'manual uninstall can remove workspace files and settings when the user chooses yes');
assert.ok(installerNsh.includes('RMDir /r "$LOCALAPPDATA\\hard-sphere-lab-updater"'), 'manual uninstall can remove updater cache when the user chooses yes');
assert.ok(!installerNsh.includes('Remove Hard Sphere Lab user data and cache?'), 'uninstaller prompt should not show the old English app name');
assert.ok(electronMain.includes("const appTitle = '热容比实验室';"), 'desktop window title should use the current Chinese app name');
assert.ok(electronMain.includes('const getRuntimeWorkingDirectory = () => {'), 'desktop exporter should choose a real working directory');
assert.ok(electronMain.includes('app.isPackaged && process.resourcesPath'), 'packaged desktop exporter should run from the real resources directory');
assert.ok(electronMain.includes("rootDir.includes('.asar')"), 'desktop exporter should never use app.asar as a child-process cwd');
assert.ok(electronMain.includes("fsSync.statSync(rootDir).isDirectory()"), 'desktop exporter should avoid using app.asar as a cwd');
assert.match(
  electronMain,
  /spawn\(command, args, \{\s*cwd: getRuntimeWorkingDirectory\(\),\s*windowsHide: true,/,
  'desktop exporter child processes should run from the real runtime directory',
);
assert.ok(indexHtml.includes('<title>热容比实验室</title>'), 'web document title should use the current Chinese app name');
assert.ok(webManifest.includes('"name": "热容比实验室"'), 'web manifest should use the current app name');
assert.ok(!source.includes('Heat Capacity Ratio Lab with Hard Sphere'), 'workbench copy should not use the old hard-sphere product subtitle');
assert.ok(!source.includes('开始新的硬球工作台'), 'empty-state copy should not describe the app as a hard-sphere workbench');

assert.match(viteConfig, /define:\s*\{[\s\S]*?__APP_VERSION__:\s*JSON\.stringify\(packageJson\.version\)/, 'Vite should expose package.json version to the app');
assert.ok(source.includes('const WORKBENCH_APP_VERSION = __APP_VERSION__;'), 'about window should read the app version from Vite package metadata');

const newMenuSource = source.slice(
  indexOfOrFail(source, "if (openTopMenu === 'new')", 'new menu should exist'),
  indexOfOrFail(source, "if (openTopMenu === 'edit')", 'edit menu should exist'),
);
assert.ok(
  newMenuSource.indexOf("createFile('ideal')") < newMenuSource.indexOf("createFile('heatCapacity')")
    && newMenuSource.indexOf("createFile('heatCapacity')") < newMenuSource.indexOf("createFile('standard')"),
  'New Study menu should order entries as ideal / heat capacity / standard',
);

const emptyActionsSource = source.slice(
  indexOfOrFail(source, 'const renderEmptyStudyActions', 'empty study action renderer should exist'),
  indexOfOrFail(source, 'const renderEmptyWorkbench', 'empty workbench renderer should exist'),
);
assert.ok(
  emptyActionsSource.indexOf("createFile('ideal')") < emptyActionsSource.indexOf("createFile('heatCapacity')")
    && emptyActionsSource.indexOf("createFile('heatCapacity')") < emptyActionsSource.indexOf("createFile('standard')"),
  'empty-state create actions should order entries as ideal / heat capacity / standard',
);

const settingsMenuSource = source.slice(
  indexOfOrFail(source, "if (openTopMenu === 'settings')", 'settings menu should exist'),
  indexOfOrFail(source, "if (openTopMenu === 'help')", 'help menu should exist'),
);
assert.ok(!settingsMenuSource.includes('menus.exportEnvironment'), 'settings menu should not expose the export environment row');
assert.ok(!settingsMenuSource.includes('exportEnvironmentStatus'), 'settings menu should not expose raw export environment status');

assert.match(source, /const \[aboutWindowOpen, setAboutWindowOpen\] = useState\(false\);/, 'about window should have independent open state');
assert.match(source, /const renderAboutWindow = \(\) => \{/, 'about window renderer should exist');
assert.match(source, /onClick=\{openAboutWindow\}[\s\S]*?\{workbenchCopy\.menus\.about\}/, 'Help > About should open the about window instead of logging a mock action');
assert.ok(source.includes('{renderAboutWindow()}'), 'about window should render above the main interface');

const aboutSource = source.slice(
  indexOfOrFail(source, 'const renderAboutWindow = () => {', 'about renderer should exist'),
  indexOfOrFail(source, 'const renderGeneralSettingsWindow = () => {', 'settings renderer should follow about renderer'),
);
assert.ok(
  aboutSource.indexOf('workbenchCopy.about.currentVersion') < aboutSource.indexOf('workbenchCopy.about.checkUpdates')
    && aboutSource.indexOf('workbenchCopy.about.checkUpdates') < aboutSource.indexOf('workbenchCopy.about.localDataExportEnvironment'),
  'about rows should order current version, update check, then local data export environment',
);
assert.ok(aboutSource.includes('WORKBENCH_APP_VERSION'), 'about window should display the package-derived version');
assert.ok(source.includes('getWorkbenchSessionCacheSummary(files, workbenchCopy)'), 'about window should summarize current workspace session files');
assert.ok(aboutSource.includes('<ChevronRight size={17} />'), 'check rows should use a right-arrow icon when idle');
assert.ok(aboutSource.includes('<Loader2 size={15} />'), 'check rows should use a spinner icon while checking');
assert.ok(aboutSource.includes('studio-about-result-toast'), 'about window should show centered check-result feedback');

for (const expression of [
  'about: {',
  'currentVersion: string;',
  'checkUpdates: string;',
  'localDataExportEnvironment: string;',
  'workspaceSessionCache: string;',
  'environmentResultTitle: string;',
  'updateResultTitle: string;',
  'sessionCacheSummary: (total: number) => string;',
  'sessionCacheBreakdown: (ideal: number, heat: number, standard: number) => string;',
]) {
  assert.ok(source.includes(expression), `about copy contract should include ${expression}`);
}

assert.match(
  styles,
  /\.studio-about-window[\s\S]*\.studio-about-card[\s\S]*\.studio-about-row[\s\S]*\.studio-about-action-row[\s\S]*\.studio-about-result-toast/,
  'about window CSS should define the engineering list layout and centered result toast',
);
assert.match(
  styles,
  /\.studio-about-row \{[\s\S]*grid-template-columns: minmax\(150px, 0\.42fr\) minmax\(0, 1fr\);/,
  'about rows should use left label and right content columns',
);

console.log('workbenchAboutWindow tests passed');
