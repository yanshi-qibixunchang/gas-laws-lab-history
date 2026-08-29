import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  description?: string;
  author?: { name?: string; url?: string };
  build?: {
    publish?: Array<{ provider?: string; owner?: string; repo?: string }>;
    electronUpdaterCompatibility?: string;
    nsis?: { artifactName?: string };
    files?: string[];
  };
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
const releaseNotes = JSON.parse(readFileSync(new URL('../../docs/releases/release-notes.json', import.meta.url), 'utf8')) as {
  releases?: Array<{
    version?: string;
    download?: { releasePage?: string; windowsInstaller?: string };
  }>;
};
const electronMain = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const preload = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const electronTypes = readFileSync(new URL('../../electron.d.ts', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const updaterModule = readFileSync(new URL('../../src/features/workbench/workbenchDesktopUpdater.ts', import.meta.url), 'utf8');
const updateDialogSource = readFileSync(new URL('../../src/features/workbench/WorkbenchUpdateDialog.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const updaterMetadataSource = readFileSync(new URL('../../electron/updaterMetadata.cjs', import.meta.url), 'utf8');
const installerNsh = readFileSync(new URL('../../build/installer.nsh', import.meta.url), 'utf8');
const { RUNTIME_RELEASE_CONFIG } = require('../../electron/runtimeReleaseConfig.cjs') as {
  RUNTIME_RELEASE_CONFIG: {
    githubPublishTarget: { provider: string; owner: string; repo: string };
    nsisArtifactName: string;
  };
};

assert.match(packageJson.description ?? '', /hard-sphere molecular dynamics/, 'desktop package metadata should describe the product');
assert.deepEqual(
  packageJson.author,
  {
    name: 'Project Team',
    url: 'https://github.com/yanshi-qibixunchang/gas-laws-lab-history',
  },
  'desktop package metadata should identify the repository owner without inventing contact details',
);
assert.ok(packageJson.dependencies?.['electron-updater'], 'electron-updater must be installed as an app dependency');
assert.deepEqual(
  packageJson.build?.publish?.[0],
  { provider: 'github', owner: 'yanshi-qibixunchang', repo: 'gas-laws-lab-release' },
  '4.1.6 should embed the new public release repository as the future GitHub update channel',
);
assert.deepEqual(
  RUNTIME_RELEASE_CONFIG.githubPublishTarget,
  packageJson.build?.publish?.[0],
  'packaged updater runtime target must exactly match electron-builder publish configuration',
);
const migrationRelease = releaseNotes.releases?.find((release) => release.version === '4.1.6');
assert.equal(
  migrationRelease?.download?.releasePage,
  'https://github.com/yanshi-qibixunchang/hard-sphere-lab-1/releases/tag/v4.1.6',
  '4.1.6 release notes should keep the migration release page in the old repository for 4.1.5 clients',
);
assert.equal(
  migrationRelease?.download?.windowsInstaller,
  'https://github.com/yanshi-qibixunchang/hard-sphere-lab-1/releases/download/v4.1.6/heat-capacity-lab-setup-4.1.6.exe',
  '4.1.6 release notes should keep the migration installer in the old repository for 4.1.5 clients',
);
assert.equal(packageJson.build?.electronUpdaterCompatibility, '>=2.16', 'updater metadata should use the modern files format');
assert.equal(
  packageJson.build?.nsis?.artifactName,
  'heat-capacity-lab-setup-${version}.${ext}',
  'the local NSIS installer file name should match updater metadata instead of relying on a safe GitHub alias',
);
assert.equal(
  RUNTIME_RELEASE_CONFIG.nsisArtifactName,
  packageJson.build?.nsis?.artifactName,
  'packaged updater runtime artifact template must exactly match electron-builder NSIS configuration',
);
assert.doesNotMatch(
  updaterMetadataSource,
  /require\(['"]\.\.\/package\.json['"]\)/,
  'packaged updater metadata must not read build fields that electron-builder prunes from app.asar package.json',
);
assert.ok(
  packageJson.build?.files?.includes('docs/releases/release-notes.json'),
  'structured release notes should be packaged with the desktop app',
);

assert.ok(electronMain.includes("const { autoUpdater } = require('electron-updater');"), 'desktop main process should load electron-updater');
assert.ok(electronMain.includes('shell'), 'desktop main process should use shell.openExternal for manual downloads');
assert.ok(electronMain.includes("require('./updaterMetadata.cjs')"), 'desktop main process should use updater metadata helpers');
assert.ok(electronMain.includes('getReleaseMetadataForUpdateInfo'), 'desktop main process should prefer remote structured update metadata');
assert.match(
  electronMain,
  /const getKnownUpdateReleaseMetadata = \(\) => \{[\s\S]*releaseSummary: updateState\.releaseSummary \?\? packagedMetadata\.releaseSummary[\s\S]*releaseSections: updateState\.releaseSections \?\? packagedMetadata\.releaseSections/,
  'desktop update downloads should preserve remote structured release metadata instead of replacing it with stale packaged notes',
);
assert.match(
  electronMain,
  /autoUpdater\.on\('download-progress'[\s\S]*\.\.\.getKnownUpdateReleaseMetadata\(\)/,
  'download progress events should keep structured release sections while the installer is downloading',
);
assert.match(
  electronMain,
  /ipcMain\.handle\('hsl-updater:download'[\s\S]*status: 'downloading'[\s\S]*\.\.\.getKnownUpdateReleaseMetadata\(\)/,
  'the initial downloading state should keep the already discovered structured release notes',
);
assert.match(
  electronMain,
  /status: 'retrying'[\s\S]*\.\.\.getKnownUpdateReleaseMetadata\(\)/,
  'retrying update states should keep the structured release notes visible',
);
assert.ok(electronMain.includes('autoUpdater.autoDownload = false;'), 'updates should wait for explicit user confirmation before downloading');
assert.ok(electronMain.includes('autoUpdater.autoInstallOnAppQuit = true;'), 'downloaded updates should be staged for safe install');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:check'"), 'desktop main process should expose a check-for-updates IPC route');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:download'"), 'desktop main process should expose an update download IPC route');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:quit-and-install'"), 'desktop main process should expose a restart-and-install IPC route');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:open-manual-download'"), 'desktop main process should expose a manual download IPC route');
assert.match(
  electronMain,
  /getManualRecoveryTargetUrl\(updateState\)/,
  'manual recovery should select its trusted target using the updater error stage',
);
assert.ok(electronMain.includes('MAX_DOWNLOAD_ATTEMPTS'), 'desktop update downloads should use the shared retry attempt count');
assert.match(electronMain, /const updaterOperationCoordinator = createUpdaterOperationCoordinator\(\)/, 'all updater stages should share one cross-stage operation coordinator');
assert.match(electronMain, /const runUpdaterStage = \(stage, taskFactory\) => \{[\s\S]*activeStage !== stage[\s\S]*canStartUpdaterStage\(stage, updateState\)[\s\S]*updaterOperationCoordinator\.run\(stage, taskFactory\)/, 'updater requests should reject cross-stage overlap and illegal state transitions before invoking electron-updater');
assert.match(electronMain, /return runUpdaterStage\('check', async \(\) => \{[\s\S]*await autoUpdater\.checkForUpdates\(\);/, 'repeated check clicks should await the same in-flight check instead of returning stale state');
assert.match(electronMain, /return runUpdaterStage\('download', async \(\) => \{/, 'repeated download clicks should route through the shared cross-stage task');
assert.match(
  electronMain,
  /return runUpdaterStage\('install', async \(\) => \{[\s\S]*prepareWindowsForExit[\s\S]*return new Promise\(\(resolve\) => \{[\s\S]*autoUpdater\.quitAndInstall/,
  'restart clicks should remain single-flight until Electron quits or the install watchdog restores the app',
);
assert.match(electronMain, /if \(updaterOperationCoordinator\.activeStage !== 'check'\) return;[\s\S]*if \(updaterOperationCoordinator\.activeStage !== 'download'\) return;/, 'late updater events should be ignored when they do not belong to the active stage');
assert.match(
  electronMain,
  /UPDATE_INSTALL_APPROVAL_TIMEOUT_MS = UPDATE_INSTALL_EXIT_WATCHDOG_MS \+ 2_000/,
  'global-exit approval must outlive the updater watchdog so registry-preserving close approval cannot expire first',
);
const installWatchdogMatch = electronMain.match(/UPDATE_INSTALL_EXIT_WATCHDOG_MS = ([\d_]+);/);
const updaterPollCountMatch = installerNsh.match(/!define HSL_UpdaterShutdownPollCount (\d+)/);
assert.ok(installWatchdogMatch && updaterPollCountMatch, 'updater exit timing constants should remain explicit and testable');
const installWatchdogMs = Number(installWatchdogMatch[1]!.replaceAll('_', ''));
const updaterFallbackBudgetMs = 300 + 1_000 + Number(updaterPollCountMatch[1]) * 500 + 1_000;
assert.ok(
  installWatchdogMs >= updaterFallbackBudgetMs + 3_000,
  'the renderer must stay quiesced until the updater-only NSIS close/kill fallback and process recheck have completed',
);
assert.ok(electronMain.includes('isTransientUpdateError'), 'desktop update downloads should only retry transient network errors');
assert.ok(electronMain.includes("status: 'retrying'"), 'desktop update downloads should broadcast retrying status');
assert.ok(electronMain.includes("webContents.send('hsl-updater:status'"), 'updater events should be forwarded to renderer windows');
assert.ok(electronMain.includes('app.isPackaged'), 'update checks should distinguish packaged desktop builds from web/dev previews');

assert.ok(preload.includes("contextBridge.exposeInMainWorld('hardSphereLabUpdater'"), 'preload should expose the updater bridge');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:check'"), 'preload updater bridge should check for updates');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:download'"), 'preload updater bridge should start update downloads');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:quit-and-install'"), 'preload updater bridge should restart and install');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:open-manual-download'"), 'preload updater bridge should open the manual installer download');
assert.ok(preload.includes("ipcRenderer.on('hsl-updater:status'"), 'preload updater bridge should subscribe to updater status events');

assert.ok(electronTypes.includes("hardSphereLabUpdater?: {"), 'desktop TypeScript declarations should include the updater bridge');
assert.ok(electronTypes.includes('openManualDownload'), 'desktop TypeScript declarations should type the manual download bridge');

assert.doesNotMatch(source, /interface WorkbenchDesktopUpdaterBridge/, 'workbench should rely on the shared desktop bridge declaration instead of duplicating it locally');
assert.ok(source.includes('const [updateDialogOpen, setUpdateDialogOpen]'), 'workbench should keep dialog visibility separate from the authoritative updater state');
assert.ok(source.includes('const updateDialogState = updateDialogOpen ? updaterState : null;'), 'the update dialog should render directly from the authoritative updater state');
assert.ok(updaterModule.includes("WORKBENCH_IGNORED_UPDATE_VERSION_KEY = 'hslIgnoredUpdateVersion'"), 'updater boundary should own the ignored-version storage key');
assert.ok(source.includes('WORKBENCH_IGNORED_UPDATE_VERSION_KEY'), 'workbench should persist ignored update versions through the updater boundary');
assert.ok(source.includes('window.hardSphereLabUpdater?.checkForUpdates'), 'About > Check for Updates should call the desktop update bridge');
assert.ok(source.includes('window.hardSphereLabUpdater?.downloadUpdate'), 'update dialog should start downloads through the desktop bridge');
assert.ok(source.includes('window.hardSphereLabUpdater?.quitAndInstall'), 'downloaded updates should offer restart-and-install');
assert.ok(source.includes('window.hardSphereLabUpdater?.openManualDownload'), 'failed updates should offer the direct manual installer download');
assert.match(
  source,
  /nextState\.status === 'error' && hasDesktopUpdaterBridge\(\)/,
  'a first update-check failure must still open the recovery dialog because the desktop bridge has a trusted latest-release fallback',
);
assert.match(
  source,
  /isWorkbenchUpdateCheckFailure\(updateDialogState\)[\s\S]*setUpdateDialogOpen\(false\);[\s\S]*runAboutUpdateCheck\(\);/,
  'retrying any update-check failure must rerun discovery even when an earlier not-available result left stale metadata',
);
assert.match(
  updaterModule,
  /const mergeWorkbenchUpdateState = \([\s\S]*latestVersion: nextState\.latestVersion \?\? previousState\.latestVersion[\s\S]*releaseSummary: nextState\.releaseSummary \?\? previousState\.releaseSummary[\s\S]*releaseSections: nextState\.releaseSections \?\? previousState\.releaseSections/,
  'renderer updater state should preserve release identity and structured notes across partial events',
);
assert.match(
  source,
  /setUpdaterState\(\(currentState\) => mergeWorkbenchUpdateState\(nextState, currentState\)\)/,
  'renderer should merge partial downloading and retrying events into one authoritative updater state',
);
assert.ok(source.includes('<WorkbenchUpdateDialog'), 'workbench should mount the dedicated update dialog component');
assert.ok(updateDialogSource.includes('studio-update-dialog'), 'update dialog should use a dedicated engineering-style CSS block');
assert.ok(updateDialogSource.includes('copy.updateAvailableTitle'), 'update dialog should use localized update-available copy');
assert.ok(updateDialogSource.includes('copy.retryingUpdateStatus'), 'update dialog should localize retrying status');
assert.ok(updateDialogSource.includes('copy.manualDownload'), 'update dialog should localize the manual download action');
assert.ok(updateDialogSource.includes('releaseSections'), 'update dialog should render structured release sections');
assert.ok(updateDialogSource.includes('copy.ignoreThisVersion'), 'update dialog should offer an ignore-version action');
assert.ok(updateDialogSource.includes('copy.updateNow'), 'update dialog should offer an immediate update action');
assert.ok(
    appSource.includes('<PromptPersistentBanner') &&
    appSource.includes("dataAttributes={{ 'data-workbench-persistence-safe-mode': 'true' }}") &&
    appSource.includes('<WorkbenchAspectFrame>'),
  'persistence bootstrap failures should keep the workbench usable and expose a non-blocking safe-mode notice',
);

assert.match(
  styles,
  /\.studio-update-dialog[\s\S]*\.studio-update-version-grid[\s\S]*\.studio-update-actions/,
  'update dialog CSS should define a compact engineering dialog layout',
);

const updateVersionGridBlock = styles.match(/\.studio-update-version-grid \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.ok(updateVersionGridBlock, 'update dialog should define a dedicated version information block');
assert.doesNotMatch(
  updateVersionGridBlock,
  /border-left|outline|box-shadow|studio-accent|79,\s*127,\s*184|37,\s*99,\s*235/,
  'update dialog version information block should stay neutral without blue accent borders or emphasis shadows',
);

assert.match(
  styles,
  /\.studio-theme-light \.studio-update-dialog/,
  'update dialog should have light-theme styling',
);
assert.match(
  styles,
  /\.studio-update-status/,
  'update dialog CSS should define explicit status messaging for retry and failure states',
);
assert.match(
  styles,
  /\.studio-update-actions \.lucide-loader2 \{[\s\S]*?animation: studio-about-spin 780ms linear infinite;/,
  'update dialog loader icon should keep rotating while download or install is in progress',
);
assert.match(
  styles,
  /\.studio-update-note-section/,
  'update dialog CSS should define structured release-note sections',
);

assert.match(
  packageJson.scripts?.['desktop:installer'] ?? '',
  /writeReleaseMetadata\.cjs/,
  'desktop installer builds should enrich latest.yml with structured release metadata after packaging',
);
for (const scriptName of ['desktop:installer', 'desktop:portable']) {
  assert.match(
    packageJson.scripts?.[scriptName] ?? '',
    /node scripts\/runElectronBuilder\.cjs (?:nsis|portable)\b/,
    `${scriptName} must use the fail-closed local electron-builder entrypoint`,
  );
}

console.log('workbenchAutoUpdater tests passed');
