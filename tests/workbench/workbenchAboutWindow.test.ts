const preferencesSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchSettingsPreferences.ts', import.meta.url), 'utf8');
const auxiliaryActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchAuxiliaryWindowActions.ts', import.meta.url), 'utf8');
const auxiliarySource = readFileSync(new URL('../../src/features/workbench/useWorkbenchAuxiliaryWindows.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchMenuBarSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchMenuBar.tsx', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const workbenchSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const workbenchStudioCopySource = readFileSync(new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const brandSource = readFileSync(new URL('../../src/features/workbench/workbenchBrand.ts', import.meta.url), 'utf8');
const aboutSource = readFileSync(new URL('../../src/features/workbench/WorkbenchAboutWindow.tsx', import.meta.url), 'utf8');
const buildNoticeSource = readFileSync(new URL('../../src/features/workbench/WorkbenchBuildNoticeWindow.tsx', import.meta.url), 'utf8');
const buildNoticeContractSource = readFileSync(new URL('../../src/features/workbench/workbenchBuildNoticeContract.ts', import.meta.url), 'utf8');
const buildNoticeContentSource = readFileSync(new URL('../../src/features/workbench/workbenchBuildNoticeContent.ts', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const source = `${workbenchSource}\n${workbenchStudioCopySource}\n${aboutSource}\n${buildNoticeSource}\n${buildNoticeContractSource}\n${buildNoticeContentSource}\n${topCommandsSource}`;
const emptyWorkspaceSource = readFileSync(new URL('../../src/features/workbench/WorkbenchEmptyWorkspace.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const promptShellStyles = readFileSync(new URL('../../src/components/prompts/PromptDialogShell.css', import.meta.url), 'utf8');
const promptFeedbackSource = readFileSync(new URL('../../src/components/prompts/PromptFeedback.tsx', import.meta.url), 'utf8');
const promptFeedbackStyles = readFileSync(new URL('../../src/components/prompts/PromptFeedback.css', import.meta.url), 'utf8');
const rootStyles = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  name?: string;
  build?: {
    appId?: string;
    productName?: string;
    extraResources?: Array<{ from?: string; to?: string }>;
    nsis?: {
      displayLanguageSelector?: boolean;
      installerLanguages?: string[];
      language?: string;
      shortcutName?: string;
    };
  };
};
const electronMain = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const exporterProcessRunner = readFileSync(
  new URL('../../electron/exporterProcessRunner.cjs', import.meta.url),
  'utf8',
);
const legacyUserDataPathSource = readFileSync(new URL('../../electron/legacyUserDataPath.cjs', import.meta.url), 'utf8');
const electronPreload = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const electronTypes = readFileSync(new URL('../../electron.d.ts', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const webManifest = readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8');
const installerNsh = readFileSync(new URL('../../build/installer.nsh', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
const legalFileUrls = [
  '../../public/legal/third-party-summary.json',
  '../../public/legal/third-party-dependencies.html',
  '../../public/legal/third-party-license-texts.html',
  '../../public/legal/LICENSE.electron.txt',
  '../../public/legal/font-licenses.txt',
  '../../public/legal/exporter-licenses.html',
  '../../public/legal/audio-materials.html',
].map((filePath) => new URL(filePath, import.meta.url));
const generatedLegalHtmlFiles = [
  {
    label: 'third-party dependency list',
    html: readFileSync(new URL('../../public/legal/third-party-dependencies.html', import.meta.url), 'utf8'),
  },
  {
    label: 'exporter component licenses',
    html: readFileSync(new URL('../../public/legal/exporter-licenses.html', import.meta.url), 'utf8'),
  },
  {
    label: 'audio materials and licenses',
    html: readFileSync(new URL('../../public/legal/audio-materials.html', import.meta.url), 'utf8'),
  },
];
const fontLicenseNotes = readFileSync(new URL('../../public/fonts/LICENSES.txt', import.meta.url), 'utf8');
const generatedFontLicenseNotes = readFileSync(new URL('../../public/legal/font-licenses.txt', import.meta.url), 'utf8');

const indexOfOrFail = (haystack: string, needle: string, message: string) => {
  const index = haystack.indexOf(needle);
  assert.notEqual(index, -1, message);
  return index;
};

assert.ok(existsSync(new URL('../../public/fonts/NotoSansSC/NotoSansSC-Variable.ttf', import.meta.url)), 'bundled Noto Sans SC variable font should exist');
assert.ok(existsSync(new URL('../../public/fonts/NotoSansSC/OFL.txt', import.meta.url)), 'bundled Noto Sans SC OFL text should exist');
assert.ok(existsSync(new URL('../../public/fonts/GasLawsLabSerif/GasLawsLabSerif-Semibold.ttf', import.meta.url)), 'bundled product-title serif subset should exist');
assert.ok(existsSync(new URL('../../public/fonts/GasLawsLabSerif/NOTICE.txt', import.meta.url)), 'bundled product-title serif subset notice should exist');
for (const legacyFontPath of [
  '../../public/fonts/Inter-300.woff2',
  '../../public/fonts/Inter-400.woff2',
  '../../public/fonts/Inter-500.woff2',
  '../../public/fonts/Inter-600.woff2',
  '../../public/fonts/Inter-700.woff2',
  '../../public/fonts/Inter-800.woff2',
  '../../public/fonts/Inter-900.woff2',
  '../../public/fonts/PlayfairDisplay-600.woff2',
  '../../public/fonts/PlayfairDisplay-700.woff2',
  '../../public/fonts/PlayfairDisplay-800.woff2',
  '../../public/fonts/PlayfairDisplay-900.woff2',
]) {
  assert.equal(existsSync(new URL(legacyFontPath, import.meta.url)), false, `superseded font asset should be physically removed: ${legacyFontPath}`);
}
assert.match(rootStyles, /font-family:\s*"Noto Sans SC"[\s\S]*font-weight:\s*100 900/, 'global styles should register the shared Noto Sans SC variable font');
assert.match(rootStyles, /--app-font-ui:\s*"Noto Sans SC"/, 'global UI typography should use Noto Sans SC');
assert.match(rootStyles, /font-family:\s*"Gas Laws Lab Serif"[\s\S]*font-weight:\s*600/, 'global styles should register the licensed product-title serif subset');
assert.match(rootStyles, /--app-font-product-title:\s*"Gas Laws Lab Serif"/, 'product introduction titles should use the bundled serif subset');
assert.doesNotMatch(rootStyles, /font-family:\s*"(?:Inter|Playfair Display)"/, 'global styles should not register the superseded Inter or Playfair Display schemes');
assert.match(fontLicenseNotes, /Noto Sans SC[\s\S]*Gas Laws Lab Serif[\s\S]*JetBrains Mono/, 'source font notices should list the retained UI fonts and the product-title subset');
assert.doesNotMatch(fontLicenseNotes, /\bInter\b|Playfair Display/, 'source font notices should not retain superseded families');
assert.equal(generatedFontLicenseNotes, fontLicenseNotes, 'generated font license notes should stay synchronized with the source notice');
assert.doesNotMatch(buildNoticeContentSource, /\bInter\b|Playfair Display/, 'localized build notices should not claim superseded font families');

assert.equal(packageJson.name, 'hard-sphere-lab', 'package identity must preserve the legacy user-data and updater identity');
assert.equal(packageJson.build?.appId, 'com.hardspherelab.desktop', 'Windows installer identity must remain stable across the brand update');
assert.equal(packageJson.build?.productName, 'Gas Laws Lab', 'the one-binary Windows shell should use the stable cross-language product name');
assert.equal(packageJson.build?.nsis?.shortcutName, 'Gas Laws Lab', 'Windows shortcuts should use the stable cross-language shell name');
assert.equal(packageJson.build?.nsis?.displayLanguageSelector, false, 'NSIS installer should not show a startup language selector');
assert.equal(packageJson.build?.nsis?.installerLanguages, undefined, 'NSIS installer should not offer a startup language list');
assert.equal(packageJson.build?.nsis?.language, '2052', 'NSIS installer metadata should default to Simplified Chinese');
assert.ok(packageJson.build?.extraResources?.some((entry) => entry.from === 'public/legal' && entry.to === 'legal'), 'desktop package should include generated legal resources outside the app bundle');
for (const legalFileUrl of legalFileUrls) {
  assert.ok(existsSync(legalFileUrl), `generated legal file should exist: ${legalFileUrl.pathname}`);
  assert.ok(statSync(legalFileUrl).size > 0, `generated legal file should not be empty: ${legalFileUrl.pathname}`);
}
for (const { label, html } of generatedLegalHtmlFiles) {
  const anchors = html.match(/<a\b[^>]*>/g) ?? [];
  const externalAnchors = anchors.filter((anchor) => /\bhref="https?:\/\//.test(anchor));
  assert.ok(externalAnchors.length > 0, `${label} should contain external source links`);
  for (const anchor of externalAnchors) {
    assert.match(anchor, /\btarget="_blank"/, `${label} external links should open outside the embedded preview frame`);
    assert.match(anchor, /\brel="noopener noreferrer"/, `${label} external links should isolate the opener context`);
  }
}
assert.ok(installerNsh.includes('!define HSL_RemoveUserDataPrompt "是否删除气律实验室的用户数据和缓存？'), 'manual uninstaller prompt should use the new Simplified Chinese app name');
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
assert.ok(electronMain.includes("const appTitle = 'Gas Laws Lab';"), 'desktop startup and native metadata should use the stable Windows shell name');
assert.match(
  legacyUserDataPathSource,
  /const LEGACY_USER_DATA_DIRECTORY_NAME = 'hard-sphere-lab';[\s\S]*fs\.mkdirSync\(legacyUserDataPath, \{ recursive: true \}\);[\s\S]*electronApp\.setPath\('userData', legacyUserDataPath\);/,
  'desktop startup must create and retain the legacy hard-sphere-lab user-data directory before opening any workspace records',
);
assert.ok(
  indexOfOrFail(electronMain, 'ensureLegacyUserDataPath(app)', 'desktop startup should explicitly set the legacy user-data path')
    < indexOfOrFail(electronMain, "require('electron-updater')", 'desktop startup should load electron-updater'),
  'the legacy user-data path must be fixed before updater or project modules can observe Electron paths',
);
assert.match(
  installerNsh,
  /!include "getProcessInfo\.nsh"[\s\S]*Var pid[\s\S]*!macro customCheckAppRunning/,
  'custom NSIS process checks must declare the process-info dependency that electron-builder skips for custom macros',
);
assert.match(
  installerNsh,
  /!define HSL_LegacyExecutableFilename "热容比实验室\.exe"[\s\S]*!macro customCheckAppRunning[\s\S]*HSL_FindCompatibleAppProcess[\s\S]*HSL_CloseCompatibleAppProcesses[\s\S]*HSL_KillCompatibleAppProcesses/,
  '5.1.2 coverage installs must detect and close both the legacy Chinese executable and the new stable shell executable',
);
const safeWaitIndex = indexOfOrFail(
  installerNsh,
  '!define HSL_ManualShutdownPollCount 110',
  'manual coverage installs should reserve the full persistence shutdown window',
);
const safeWaitSleepIndex = installerNsh.indexOf('Sleep 500', safeWaitIndex);
assert.ok(
  safeWaitSleepIndex > safeWaitIndex,
  'the 55-second manual persistence shutdown window should poll at 500 ms intervals',
);
assert.match(
  installerNsh,
  /\$\{If\} \$\{isUpdated\}[\s\S]*StrCpy \$R2 \$\{HSL_UpdaterShutdownPollCount\}[\s\S]*\$\{Else\}[\s\S]*StrCpy \$R2 \$\{HSL_ManualShutdownPollCount\}[\s\S]*\$\{If\} \$R1 < \$R2/,
  'automatic update handoff should retain its short post-save wait while manual coverage installs allow the full strict-save grace period',
);
const killInvocationIndex = installerNsh.lastIndexOf('!insertmacro HSL_KillCompatibleAppProcesses');
const updaterOnlyFallbackIndex = installerNsh.lastIndexOf('${If} ${isUpdated}', killInvocationIndex);
const updaterOnlyFallbackEndIndex = installerNsh.indexOf('${EndIf}', killInvocationIndex);
assert.ok(
  updaterOnlyFallbackIndex >= 0 &&
  updaterOnlyFallbackIndex < killInvocationIndex &&
  updaterOnlyFallbackEndIndex > killInvocationIndex,
  'forced process termination must remain inside the updater-only fallback',
);
const manualRetryIndex = indexOfOrFail(
  installerNsh,
  'hslRetryCompatibleProcesses:',
  'manual coverage installs should offer a non-destructive retry path',
);
assert.ok(
  installerNsh.indexOf('!insertmacro HSL_CloseCompatibleAppProcesses', manualRetryIndex) > manualRetryIndex &&
  installerNsh.indexOf('StrCpy $R1 0', manualRetryIndex) > manualRetryIndex,
  'manual retry must request a graceful close again and restart the complete persistence window',
);
assert.ok(electronMain.includes('const getRuntimeWorkingDirectory = () => {'), 'desktop exporter should choose a real working directory');
assert.ok(electronMain.includes('app.isPackaged && process.resourcesPath'), 'packaged desktop exporter should run from the real resources directory');
assert.ok(electronMain.includes("rootDir.includes('.asar')"), 'desktop exporter should never use app.asar as a child-process cwd');
assert.ok(electronMain.includes("fsSync.statSync(rootDir).isDirectory()"), 'desktop exporter should avoid using app.asar as a cwd');
assert.match(
  electronMain,
  /runBoundedCommand\(command, args, \{\s*cwd: getRuntimeWorkingDirectory\(\),/,
  'desktop exporter should pass the real runtime directory into the bounded process runner',
);
assert.match(
  exporterProcessRunner,
  /spawnImpl\(command, args, \{[\s\S]*windowsHide: true,[\s\S]*shell: false,/,
  'desktop exporter child processes should start without a visible shell window or shell parsing',
);
assert.ok(electronMain.includes("ipcMain.handle('hsl-legal:open-file'"), 'desktop main process should expose a legal-file open handler');
assert.ok(electronMain.includes("ipcMain.handle('hsl-legal:read-file'"), 'desktop main process should expose a legal-file read handler for embedded previews');
assert.ok(electronMain.includes('const LEGAL_FILE_NAMES = {'), 'desktop legal-file handler should use an allowlist instead of arbitrary paths');
assert.ok(electronMain.includes('LICENSES.chromium.html'), 'desktop legal-file handler should resolve the full Chromium license file');
assert.ok(electronPreload.includes("contextBridge.exposeInMainWorld('hardSphereLabLegal'"), 'preload should expose the legal-file bridge');
assert.ok(electronPreload.includes("ipcRenderer.invoke('hsl-legal:open-file'"), 'preload legal bridge should call the allowlisted IPC handler');
assert.ok(electronPreload.includes("readLegalFile: (fileId) => ipcRenderer.invoke('hsl-legal:read-file', fileId)"), 'preload legal bridge should expose allowlisted file reads for desktop embedded previews');
assert.ok(electronTypes.includes('interface DesktopLegalReadResult'), 'desktop types should describe legal file read results');
assert.ok(electronTypes.includes('readLegalFile: (fileId: DesktopLegalFileId) => Promise<DesktopLegalReadResult>;'), 'desktop legal bridge type should include the readLegalFile API');
assert.ok(indexHtml.includes('<title>气律实验室</title>'), 'web startup title should use the default Simplified Chinese app name');
assert.ok(webManifest.includes('"name": "Gas Laws Lab"'), 'the installable web shell should use the stable cross-language name');
assert.match(brandSource, /'zh-CN': '气律实验室'[\s\S]*'zh-TW': '氣律實驗室'[\s\S]*en: 'Gas Laws Lab'/);
assert.match(
  preferencesSource,
  /document\.documentElement\.lang = settingsLanguagePreference;[\s\S]*document\.title = getWorkbenchAppBrandName\(settingsLanguagePreference\)/,
  'changing the interface language should update both the document language and visible desktop title',
);
assert.match(
  appSource,
  /document\.documentElement\.lang = generalSettings\.language;[\s\S]*document\.title = getWorkbenchAppBrandName\(generalSettings\.language\)/,
  'restart and persistence-failure startup should restore the title from the authoritative committed language',
);
assert.ok(!source.includes('Heat Capacity Ratio Lab with Hard Sphere'), 'workbench copy should not use the old hard-sphere product subtitle');
assert.ok(!source.includes('开始新的硬球工作台'), 'empty-state copy should not describe the app as a hard-sphere workbench');

assert.match(viteConfig, /define:\s*\{[\s\S]*?__APP_VERSION__:\s*JSON\.stringify\(packageJson\.version\)/, 'Vite should expose package.json version to the app');
assert.ok(source.includes('const WORKBENCH_APP_VERSION = __APP_VERSION__;'), 'about window should read the app version from Vite package metadata');

const newMenuSource = topCommandsSource.slice(
  indexOfOrFail(topCommandsSource, "if (openMenu === 'new')", 'new menu should exist'),
  indexOfOrFail(topCommandsSource, "if (openMenu === 'edit')", 'edit menu should exist'),
);
assert.ok(
  newMenuSource.indexOf("onCreateFile('ideal')") < newMenuSource.indexOf("onCreateFile('heatCapacity')")
    && newMenuSource.indexOf("onCreateFile('heatCapacity')") < newMenuSource.indexOf("onCreateFile('heatCapacityPistonOscillation')")
    && newMenuSource.indexOf("onCreateFile('heatCapacityPistonOscillation')") < newMenuSource.indexOf("onCreateFile('standard')"),
  'New Study menu should order entries as ideal / adiabatic / piston oscillation / standard',
);

assert.ok(
  emptyWorkspaceSource.indexOf("onCreateFile('ideal')") < emptyWorkspaceSource.indexOf("onCreateFile('heatCapacity')")
    && emptyWorkspaceSource.indexOf("onCreateFile('heatCapacity')") < emptyWorkspaceSource.indexOf("onCreateFile('heatCapacityPistonOscillation')")
    && emptyWorkspaceSource.indexOf("onCreateFile('heatCapacityPistonOscillation')") < emptyWorkspaceSource.indexOf("onCreateFile('standard')"),
  'empty-state create actions should order entries as ideal / adiabatic / piston oscillation / standard',
);

const settingsMenuSource = topCommandsSource.slice(
  indexOfOrFail(topCommandsSource, "if (openMenu === 'settings')", 'settings menu should exist'),
  indexOfOrFail(topCommandsSource, "if (openMenu === 'help')", 'help menu should exist'),
);
assert.ok(!settingsMenuSource.includes('menus.exportEnvironment'), 'settings menu should not expose the export environment row');
assert.ok(!settingsMenuSource.includes('exportEnvironmentStatus'), 'settings menu should not expose raw export environment status');

assert.match(
  auxiliarySource,
  /const \[aboutWindowOpen, setAboutWindowOpen\] = useState\(\(\) => \([\s\S]*?getHeatCapacityRefreshBoolean\(initialHeatCapacityRefreshWindows, 'aboutWindowOpen'\)/,
  'about window should have independent state restored from the active heat-capacity refresh session',
);
assert.match(workbenchSource, /<WorkbenchAboutWindow/, 'about window component should be mounted by the workbench');
assert.doesNotMatch(workbenchSource, /const renderAboutWindow = \(\) => \{/, 'legacy inline about renderer should be removed');
assert.match(topCommandsSource, /onClick=\{onOpenAbout\}[\s\S]*?\{copy\.menus\.about\}/, 'Help > About should use the component callback instead of logging a mock action');
assert.match(workbenchMenuBarSource, /onOpenAbout=\{openAboutWindow\}/, 'workbench should connect Help > About to the about-window controller');
assert.match(workbenchSource, /<WorkbenchAboutWindow[\s\S]*?onOpenBuildNotice=\{openBuildNoticeWindow\}/, 'about window should receive controller callbacks through explicit props');
const buildNoticeNavSource = buildNoticeSource.slice(
  indexOfOrFail(buildNoticeSource, '<nav className="studio-build-notice-nav-panel"', 'build notice nav panel should exist'),
  indexOfOrFail(buildNoticeSource, '<div className={`studio-build-notice-body', 'build notice body should follow nav panel'),
);
const openBuildNoticeMaterialSource = auxiliaryActionsSource.slice(
  indexOfOrFail(auxiliaryActionsSource, 'const openBuildNoticeMaterial = (materialId: WorkbenchLegalMaterialId) => {', 'build notice material opener should exist'),
  indexOfOrFail(auxiliaryActionsSource, 'const closeBuildNoticeMaterial = () => {', 'build notice material closer should follow opener'),
);
const closeBuildNoticeMaterialSource = auxiliaryActionsSource.slice(
  indexOfOrFail(auxiliaryActionsSource, 'const closeBuildNoticeMaterial = () => {', 'build notice material closer should exist'),
  indexOfOrFail(auxiliaryActionsSource, 'const openBuildNoticeLegalFile = async', 'legal file opener should follow material closer'),
);
const resetBuildNoticeTransientStateSource = auxiliaryActionsSource.slice(
  indexOfOrFail(auxiliaryActionsSource, 'const resetBuildNoticeTransientState = () => {', 'build notice transient-state reset helper should exist'),
  indexOfOrFail(auxiliaryActionsSource, 'const openBuildNoticeWindow = () => {', 'build notice opener should follow the transient-state reset helper'),
);
assert.ok(
  aboutSource.indexOf('copy.currentVersion') < aboutSource.indexOf('copy.checkUpdates')
    && aboutSource.indexOf('copy.checkUpdates') < aboutSource.indexOf('copy.localDataExportEnvironment'),
  'about rows should order current version, update check, then local data export environment',
);
assert.match(workbenchSource, /appVersion=\{WORKBENCH_APP_VERSION\}/, 'about window should display the package-derived version');
assert.ok(source.includes('getWorkbenchSessionCacheSummary(files, workbenchCopy)'), 'about window should summarize current workspace session files');
assert.ok(aboutSource.includes('<ChevronRight size={17} />'), 'check rows should use a right-arrow icon when idle');
assert.ok(aboutSource.includes('<Loader2 size={15} />'), 'check rows should use a spinner icon while checking');
assert.doesNotMatch(aboutSource, /studio-about-result-toast/, 'about results should no longer use a private centered toast');
assert.match(workbenchSource, /<PromptToastRegion[\s\S]*messages=\{promptToastMessages\}/, 'about results should join the shared global toast region');
assert.match(promptFeedbackSource, /export const PromptToastRegion/, 'about results should reuse the formal prompt toast component');
assert.doesNotMatch(source, /buildPlaceholder/, 'about copy should remove the old build-placeholder field entirely');
assert.doesNotMatch(styles, /studio-about-build-note/, 'about CSS should remove the old build-placeholder note class');
assert.doesNotMatch(aboutSource, /copy\.buildPlaceholder/, 'about build notes should no longer show the placeholder release text');
assert.match(
  aboutSource,
  /onClick=\{onOpenBuildNotice\}[\s\S]*copy\.buildNotes[\s\S]*<ChevronRight size=\{17\} \/>/,
  'about build notes row should be a clickable action row with only a right-arrow affordance',
);
assert.match(
  auxiliarySource,
  /const \[buildNoticeWindowOpen, setBuildNoticeWindowOpen\] = useState\(\(\) => \([\s\S]*?getHeatCapacityRefreshBoolean\(initialHeatCapacityRefreshWindows, 'buildNoticeWindowOpen'\)/,
  'build notice should have independent secondary-window state restored from the active heat-capacity refresh session',
);
assert.doesNotMatch(source, /if \(!buildNoticeWindowOpen\)/, 'build notice closing should not depend on a delayed effect reset');
for (const resetExpression of [
  'setBuildNoticeNavOpen(false);',
  'setActiveBuildNoticeMaterialId(null);',
  'setBuildNoticeFilePreview(null);',
  'setBuildNoticeOpenError(null);',
  'buildNoticeReturnScrollTopRef.current = 0;',
  'buildNoticeRestoreScrollOnReturnRef.current = false;',
]) {
  assert.ok(resetBuildNoticeTransientStateSource.includes(resetExpression), `build notice reset helper should include ${resetExpression}`);
}
for (const controllerName of ['closeAboutWindow', 'openAboutWindow', 'openBuildNoticeWindow', 'closeBuildNoticeWindow']) {
  const controllerStart = indexOfOrFail(auxiliaryActionsSource, `const ${controllerName} = () => {`, `${controllerName} should exist`);
  const controllerBody = auxiliaryActionsSource.slice(controllerStart, auxiliaryActionsSource.indexOf('\n  };', controllerStart));
  assert.ok(controllerBody.includes('resetBuildNoticeTransientState();'), `${controllerName} should use the shared transient-state reset helper`);
}
assert.match(workbenchSource, /<WorkbenchBuildNoticeWindow/, 'build notice secondary-window component should be mounted');
assert.doesNotMatch(workbenchSource, /const renderBuildNoticeWindow = \(\) => \{/, 'legacy inline build notice renderer should be removed');
assert.match(workbenchSource, /sections=\{buildNoticeSections\[settingsLanguagePreference\]\}/, 'build notice should receive the active localized section set');
assert.doesNotMatch(source, /scrollIntoView/, 'build notice table-of-contents clicks should not ask the browser to scroll outer ancestors');
assert.match(
  auxiliaryActionsSource,
  /document\.querySelector<HTMLDivElement>\('\.studio-build-notice-body'\)[\s\S]*?container\.scrollTo\(\{\s*top: nextScrollTop,\s*behavior: 'smooth'/,
  'build notice table-of-contents clicks should smooth-scroll only the document body container',
);
assert.match(source, /studio-build-notice-nav-open/, 'build notice should support an overlay navigation drawer open state');
assert.match(source, /studio-build-notice-body-dimmed/, 'build notice body should dim and blur while the overlay navigation is open');
assert.match(source, /buildNoticeSections/, 'build notice should render from a section list so the final copy can be confirmed separately');
assert.ok(source.includes('权限说明与第三方开源许可'), 'build notice should use the approved formal Chinese title');
assert.ok(source.includes('本机权限说明'), 'build notice should include the approved local-permissions section');
assert.doesNotMatch(source, /占位说明|Placeholder copy/, 'build notice should not retain placeholder section copy');
assert.match(source, /studio-build-notice-rail/, 'build notice should keep a fixed left rail inside the secondary window');
assert.match(source, /studio-build-notice-rail-toggle/, 'build notice navigation toggle should live in the left rail');
assert.doesNotMatch(source, /studio-build-notice-header-actions/, 'build notice header should not contain the table-of-contents toggle');
assert.match(source, /studio-build-notice-document-title/, 'build notice body should render a centered document-style title');
assert.match(source, /studio-build-notice-document/, 'build notice body should use a continuous document layout');
assert.match(source, /studio-build-notice-table-wrap/, 'build notice should render approved table-style notice sections');
assert.match(source, /studio-build-notice-material-row/, 'build notice should render clickable legal material rows');
assert.match(source, /activeBuildNoticeMaterialId/, 'build notice should support an in-window legal material detail view');
assert.match(auxiliarySource, /const \[buildNoticeFilePreview, setBuildNoticeFilePreview\] = useState<WorkbenchBuildNoticeFilePreview/, 'build notice detail should keep a unified local/web preview content state');
assert.doesNotMatch(source, /buildNoticeTextPreview/, 'build notice detail should not retain the old text-only preview state');
assert.match(auxiliarySource, /const buildNoticeReturnScrollTopRef = useRef\(0\);/, 'build notice should remember the document scroll position before opening a legal detail view');
assert.match(auxiliarySource, /const buildNoticeRestoreScrollOnReturnRef = useRef\(false\);/, 'build notice should track whether a return scroll restore is pending');
assert.match(auxiliarySource, /useLayoutEffect\(\(\) => \{[\s\S]*?buildNoticeRestoreScrollOnReturnRef\.current[\s\S]*?container\.scrollTo\(\{ top: restoredScrollTop, behavior: 'auto' \}\);[\s\S]*?\}, \[activeBuildNoticeMaterialId\]\);/, 'build notice should restore the saved scroll position in the layout phase before the browser paints');
assert.match(openBuildNoticeMaterialSource, /buildNoticeReturnScrollTopRef\.current = container\?\.scrollTop \?\? 0;/, 'opening a legal detail view should save the current document scroll position');
assert.match(
  closeBuildNoticeMaterialSource,
  /buildNoticeRestoreScrollOnReturnRef\.current = true;[\s\S]*setActiveBuildNoticeMaterialId\(null\);/,
  'returning from a legal detail view should request a pre-paint scroll restore before the document view remounts',
);
assert.doesNotMatch(closeBuildNoticeMaterialSource, /setTimeout/, 'returning from a legal detail view should not use a delayed scroll restore that can visibly flicker');
assert.match(auxiliaryActionsSource, /hardSphereLabLegal!\.openLegalFile/, 'build notice detail view should open allowlisted local legal files in desktop builds');
assert.doesNotMatch(auxiliaryActionsSource, /setBuildNoticeOpenError\(result\.message/, 'desktop legal bridge errors should not bypass the active UI language');
assert.match(auxiliaryActionsSource, /setBuildNoticeOpenError\(aboutCopy\.buildNoticeOpenUnavailable\)/, 'desktop legal bridge errors should use the localized build-notice message');
assert.match(auxiliarySource, /hardSphereLabLegal!\.readLegalFile/, 'build notice detail view should read allowlisted local legal files for desktop embedded previews');
assert.match(auxiliarySource, /return \(\) => \{\s*cancelled = true;\s*\};/, 'closing or switching a build notice detail should cancel an in-flight preview update');
assert.match(source, /studio-build-notice-detail-frame/, 'build notice detail view should preview generated HTML legal files');
assert.match(source, /srcDoc=\{desktopLegalReadAvailable \? activeMaterialPreview\?\.content : undefined\}/, 'desktop build notice HTML previews should use srcDoc from the allowlisted local file bridge');
assert.match(source, /buildNoticeLargeFileBody/, 'build notice detail view should explain large local legal files instead of embedding them');
assert.match(buildNoticeNavSource, /className="studio-build-notice-nav-item"/, 'build notice navigation entries should use a left-sidebar-like row item class');
assert.doesNotMatch(buildNoticeNavSource, /section\.eyebrow/, 'build notice navigation entries should not repeat eyebrow labels');
assert.doesNotMatch(buildNoticeNavSource, /<strong>\{section\.title\}<\/strong>/, 'build notice navigation entries should not render a two-line card title');
assert.doesNotMatch(buildNoticeSource, /studio-settings-/, 'build notice secondary window should use standalone classes instead of patching settings-window classes');
assert.match(buildNoticeSource, /<PromptDialogShell/, 'build notice should reuse the shared notice/task shell');

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
  'openBuildNotice: string;',
  'closeBuildNotice: string;',
  'buildNoticeNavToggle: string;',
]) {
  assert.ok(source.includes(expression), `about copy contract should include ${expression}`);
}

assert.match(
  `${styles}\n${promptFeedbackStyles}`,
  /\.studio-about-window[\s\S]*\.studio-about-card[\s\S]*\.studio-about-row[\s\S]*\.studio-about-action-row[\s\S]*\.prompt-toast-region/,
  'about window should keep its engineering list layout while result feedback uses the shared toast region',
);
assert.match(
  styles,
  /\.studio-about-row \{[\s\S]*grid-template-columns: minmax\(150px, 0\.42fr\) minmax\(0, 1fr\);/,
  'about rows should use left label and right content columns',
);
assert.match(
  styles,
  /\.studio-build-notice-window[\s\S]*\.studio-build-notice-nav-panel/,
  'build notice CSS should define the secondary window, overlay navigation drawer, and dimmed body state',
);
assert.match(
  promptShellStyles,
  /\.prompt-dialog-overlay\.prompt-dialog-overlay\[data-prompt-shell-overlay='true'\][\s\S]*position: fixed;[\s\S]*display: grid;[\s\S]*place-items: center;/,
  'build notice should inherit the common centered modal mask',
);
assert.match(
  styles,
  /\.studio-build-notice-window\s*\{[\s\S]*grid-template-rows: auto minmax\(0, 1fr\);/,
  'build notice should retain only its document-specific row layout',
);
assert.match(
  promptShellStyles,
  /\.prompt-dialog-close\.prompt-dialog-close\s*\{[\s\S]*width: 27px;[\s\S]*height: 27px;/,
  'build notice close button should inherit the shared compact title-bar control',
);
assert.match(styles, /\.studio-build-notice-body-dimmed/, 'build notice CSS should define a dimmed body state');
assert.match(styles, /\.studio-build-notice-rail \{[\s\S]*background:/, 'build notice fixed rail should be visually separated by a color block');
assert.match(styles, /\.studio-build-notice-rail-toggle \{[\s\S]*width: 30px;[\s\S]*height: 30px;/, 'build notice rail toggle should be a compact square icon button');
assert.match(styles, /\.studio-build-notice-document-title \{[\s\S]*text-align: center;/, 'build notice document title should be centered');
assert.match(
  styles,
  /\.studio-build-notice-nav-item\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\);[\s\S]*border: 0;[\s\S]*background: transparent;/,
  'build notice navigation items should be transparent single-line rows, not framed cards',
);
assert.match(
  styles,
  /\.studio-build-notice-nav-item-text\s*\{[\s\S]*white-space: nowrap;[\s\S]*text-overflow: ellipsis;/,
  'build notice navigation item text should stay on one line',
);
assert.match(
  styles,
  /\.studio-build-notice-material-row\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*background: transparent;/,
  'build notice legal material rows should be document-list rows rather than cards',
);
assert.match(
  styles,
  /\.studio-build-notice-table-wrap table\s*\{[\s\S]*border-collapse: collapse;/,
  'build notice tables should render as continuous document tables instead of cards',
);
assert.match(
  styles,
  /\.studio-build-notice-detail-frame\s*\{[\s\S]*min-height: 440px;/,
  'build notice detail view should provide a stable preview area',
);
assert.match(
  styles,
  /\.studio-build-notice-body-dimmed[\s\S]*filter: blur/,
  'build notice body should blur when the overlay navigation drawer is open',
);
assert.match(
  rootStyles,
  /html,\s*body,\s*#root\s*\{[\s\S]*height:\s*100%;[\s\S]*overflow:\s*hidden;/,
  'browser preview should lock the app root so modal wheel scrolling cannot move the page shell',
);
assert.match(
  styles,
  /\.studio-build-notice-body\s*\{[\s\S]*overscroll-behavior:\s*contain;/,
  'build notice document scroll should not chain wheel events to the browser page',
);

console.log('workbenchAboutWindow tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchMenuBar \} from '\.\/WorkbenchMenuBar\.tsx';/);

assert.match(workbenchSource, /useWorkbenchAuxiliaryWindows\(\{/, 'the shell should wire the single auxiliary window owner');
