import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const rootStyles = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  build?: {
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
const electronPreload = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
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
];

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
assert.ok(electronMain.includes("ipcMain.handle('hsl-legal:open-file'"), 'desktop main process should expose a legal-file open handler');
assert.ok(electronMain.includes('const LEGAL_FILE_NAMES = {'), 'desktop legal-file handler should use an allowlist instead of arbitrary paths');
assert.ok(electronMain.includes('LICENSES.chromium.html'), 'desktop legal-file handler should resolve the full Chromium license file');
assert.ok(electronPreload.includes("contextBridge.exposeInMainWorld('hardSphereLabLegal'"), 'preload should expose the legal-file bridge');
assert.ok(electronPreload.includes("ipcRenderer.invoke('hsl-legal:open-file'"), 'preload legal bridge should call the allowlisted IPC handler');
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
const buildNoticeSource = source.slice(
  indexOfOrFail(source, 'const renderBuildNoticeWindow = () => {', 'build notice renderer should exist'),
  indexOfOrFail(source, 'const renderAboutWindow = () => {', 'about renderer should follow build notice renderer'),
);
const buildNoticeNavSource = buildNoticeSource.slice(
  indexOfOrFail(buildNoticeSource, '<nav className="studio-build-notice-nav-panel"', 'build notice nav panel should exist'),
  indexOfOrFail(buildNoticeSource, '<div className={`studio-build-notice-body', 'build notice body should follow nav panel'),
);
const openBuildNoticeMaterialSource = source.slice(
  indexOfOrFail(source, 'const openBuildNoticeMaterial = (materialId: WorkbenchLegalMaterialId) => {', 'build notice material opener should exist'),
  indexOfOrFail(source, 'const closeBuildNoticeMaterial = () => {', 'build notice material closer should follow opener'),
);
const closeBuildNoticeMaterialSource = source.slice(
  indexOfOrFail(source, 'const closeBuildNoticeMaterial = () => {', 'build notice material closer should exist'),
  indexOfOrFail(source, 'const openBuildNoticeLegalFile = async', 'legal file opener should follow material closer'),
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
assert.doesNotMatch(source, /buildPlaceholder/, 'about copy should remove the old build-placeholder field entirely');
assert.doesNotMatch(styles, /studio-about-build-note/, 'about CSS should remove the old build-placeholder note class');
assert.doesNotMatch(aboutSource, /workbenchCopy\.about\.buildPlaceholder/, 'about build notes should no longer show the placeholder release text');
assert.match(
  aboutSource,
  /onClick=\{openBuildNoticeWindow\}[\s\S]*workbenchCopy\.about\.buildNotes[\s\S]*<ChevronRight size=\{17\} \/>/,
  'about build notes row should be a clickable action row with only a right-arrow affordance',
);
assert.match(source, /const \[buildNoticeWindowOpen, setBuildNoticeWindowOpen\] = useState\(false\);/, 'build notice should have independent secondary-window state');
assert.match(source, /const renderBuildNoticeWindow = \(\) => \{/, 'build notice secondary-window renderer should exist');
assert.ok(source.includes('{renderBuildNoticeWindow()}'), 'build notice secondary window should render above the main interface');
assert.doesNotMatch(source, /scrollIntoView/, 'build notice table-of-contents clicks should not ask the browser to scroll outer ancestors');
assert.match(
  source,
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
assert.match(source, /const buildNoticeReturnScrollTopRef = useRef\(0\);/, 'build notice should remember the document scroll position before opening a legal detail view');
assert.match(source, /const buildNoticeRestoreScrollOnReturnRef = useRef\(false\);/, 'build notice should track whether a return scroll restore is pending');
assert.match(source, /useLayoutEffect\(\(\) => \{[\s\S]*?buildNoticeRestoreScrollOnReturnRef\.current[\s\S]*?container\.scrollTo\(\{ top: restoredScrollTop, behavior: 'auto' \}\);[\s\S]*?\}, \[activeBuildNoticeMaterialId\]\);/, 'build notice should restore the saved scroll position in the layout phase before the browser paints');
assert.match(openBuildNoticeMaterialSource, /buildNoticeReturnScrollTopRef\.current = container\?\.scrollTop \?\? 0;/, 'opening a legal detail view should save the current document scroll position');
assert.match(
  closeBuildNoticeMaterialSource,
  /buildNoticeRestoreScrollOnReturnRef\.current = true;[\s\S]*setActiveBuildNoticeMaterialId\(null\);/,
  'returning from a legal detail view should request a pre-paint scroll restore before the document view remounts',
);
assert.doesNotMatch(closeBuildNoticeMaterialSource, /setTimeout/, 'returning from a legal detail view should not use a delayed scroll restore that can visibly flicker');
assert.match(source, /hardSphereLabLegal!\.openLegalFile/, 'build notice detail view should open allowlisted local legal files in desktop builds');
assert.match(source, /studio-build-notice-detail-frame/, 'build notice detail view should preview generated HTML legal files');
assert.match(source, /buildNoticeLargeFileBody/, 'build notice detail view should explain large local legal files instead of embedding them');
assert.match(buildNoticeNavSource, /className="studio-build-notice-nav-item"/, 'build notice navigation entries should use a left-sidebar-like row item class');
assert.doesNotMatch(buildNoticeNavSource, /section\.eyebrow/, 'build notice navigation entries should not repeat eyebrow labels');
assert.doesNotMatch(buildNoticeNavSource, /<strong>\{section\.title\}<\/strong>/, 'build notice navigation entries should not render a two-line card title');
assert.doesNotMatch(buildNoticeSource, /studio-settings-/, 'build notice secondary window should use standalone classes instead of patching settings-window classes');

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
  styles,
  /\.studio-about-window[\s\S]*\.studio-about-card[\s\S]*\.studio-about-row[\s\S]*\.studio-about-action-row[\s\S]*\.studio-about-result-toast/,
  'about window CSS should define the engineering list layout and centered result toast',
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
  styles,
  /\.studio-build-notice-overlay\s*\{[\s\S]*position: fixed;[\s\S]*display: grid;[\s\S]*place-items: center;/,
  'build notice overlay should be a standalone modal overlay',
);
assert.match(
  styles,
  /\.studio-build-notice-window\s*\{[\s\S]*display: grid;[\s\S]*grid-template-rows: auto minmax\(0, 1fr\);[\s\S]*overflow: hidden;/,
  'build notice window should carry its own modal-window structure',
);
assert.match(
  styles,
  /\.studio-build-notice-close\s*\{[\s\S]*width: 30px;[\s\S]*height: 30px;/,
  'build notice close button should use its own close-button class',
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
