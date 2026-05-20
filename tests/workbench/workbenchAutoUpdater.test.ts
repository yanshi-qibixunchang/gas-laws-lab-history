import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  build?: {
    publish?: Array<{ provider?: string; owner?: string; repo?: string }>;
    electronUpdaterCompatibility?: string;
    nsis?: { artifactName?: string };
  };
  dependencies?: Record<string, string>;
};
const electronMain = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const preload = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.ok(packageJson.dependencies?.['electron-updater'], 'electron-updater must be installed as an app dependency');
assert.deepEqual(
  packageJson.build?.publish?.[0],
  { provider: 'github', owner: 'yanshi-qibixunchang', repo: 'hard-sphere-lab-1' },
  'electron-builder should publish updater metadata to the GitHub release channel',
);
assert.equal(packageJson.build?.electronUpdaterCompatibility, '>=2.16', 'updater metadata should use the modern files format');
assert.equal(
  packageJson.build?.nsis?.artifactName,
  'heat-capacity-lab-setup-${version}.${ext}',
  'the local NSIS installer file name should match updater metadata instead of relying on a safe GitHub alias',
);

assert.ok(electronMain.includes("const { autoUpdater } = require('electron-updater');"), 'desktop main process should load electron-updater');
assert.ok(electronMain.includes('autoUpdater.autoDownload = false;'), 'updates should wait for explicit user confirmation before downloading');
assert.ok(electronMain.includes('autoUpdater.autoInstallOnAppQuit = true;'), 'downloaded updates should be staged for safe install');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:check'"), 'desktop main process should expose a check-for-updates IPC route');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:download'"), 'desktop main process should expose an update download IPC route');
assert.ok(electronMain.includes("ipcMain.handle('hsl-updater:quit-and-install'"), 'desktop main process should expose a restart-and-install IPC route');
assert.ok(electronMain.includes("webContents.send('hsl-updater:status'"), 'updater events should be forwarded to renderer windows');
assert.ok(electronMain.includes('app.isPackaged'), 'update checks should distinguish packaged desktop builds from web/dev previews');

assert.ok(preload.includes("contextBridge.exposeInMainWorld('hardSphereLabUpdater'"), 'preload should expose the updater bridge');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:check'"), 'preload updater bridge should check for updates');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:download'"), 'preload updater bridge should start update downloads');
assert.ok(preload.includes("ipcRenderer.invoke('hsl-updater:quit-and-install'"), 'preload updater bridge should restart and install');
assert.ok(preload.includes("ipcRenderer.on('hsl-updater:status'"), 'preload updater bridge should subscribe to updater status events');

assert.ok(source.includes('interface WorkbenchDesktopUpdaterBridge'), 'workbench should type the updater bridge');
assert.ok(source.includes('const [updateDialogState, setUpdateDialogState]'), 'workbench should keep dedicated update dialog state');
assert.ok(source.includes('hslIgnoredUpdateVersion'), 'workbench should persist ignored update versions');
assert.ok(source.includes('window.hardSphereLabUpdater?.checkForUpdates'), 'About > Check for Updates should call the desktop update bridge');
assert.ok(source.includes('window.hardSphereLabUpdater?.downloadUpdate'), 'update dialog should start downloads through the desktop bridge');
assert.ok(source.includes('window.hardSphereLabUpdater?.quitAndInstall'), 'downloaded updates should offer restart-and-install');
assert.ok(source.includes('const renderUpdateDialog = () => {'), 'workbench should render a dedicated update dialog');
assert.ok(source.includes('studio-update-dialog'), 'update dialog should use a dedicated engineering-style CSS block');
assert.ok(source.includes('workbenchCopy.about.updateAvailableTitle'), 'update dialog should use localized update-available copy');
assert.ok(source.includes('workbenchCopy.about.ignoreThisVersion'), 'update dialog should offer an ignore-version action');
assert.ok(source.includes('workbenchCopy.about.updateNow'), 'update dialog should offer an immediate update action');

assert.match(
  styles,
  /\.studio-update-dialog[\s\S]*\.studio-update-version-grid[\s\S]*\.studio-update-actions/,
  'update dialog CSS should define a compact engineering dialog layout',
);
assert.match(
  styles,
  /\.studio-theme-light \.studio-update-dialog/,
  'update dialog should have light-theme styling',
);

console.log('workbenchAutoUpdater tests passed');
