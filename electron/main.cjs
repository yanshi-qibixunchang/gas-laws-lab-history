const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  MAX_DOWNLOAD_ATTEMPTS,
  getReleaseMetadataForUpdateInfo,
  getReleaseMetadataForVersion,
  isAllowedManualDownloadUrl,
  isTransientUpdateError,
} = require('./updaterMetadata.cjs');

const rootDir = path.resolve(__dirname, '..');
const preloadPath = path.join(__dirname, 'preload.cjs');
const appTitle = '热容比实验室';
const WORKBENCH_WINDOW_WIDTH = 1440;
const WORKBENCH_WINDOW_HEIGHT = 810;
const WORKBENCH_WINDOW_MIN_WIDTH = 1280;
const WORKBENCH_WINDOW_MIN_HEIGHT = 720;
const WORKBENCH_WINDOW_ASPECT_RATIO = 16 / 9;
const exportRootFolderName = 'Heat Capacity Ratio Lab Exports';
const USER_GUIDE_URLS = {
  'zh-CN': 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release#readme',
  'zh-TW': 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/blob/main/README.zh-TW.md',
  en: 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/blob/main/README.en.md',
};
let selectedExporterRuntime = null;
let updateCheckPromise = null;
let updateDownloadInProgress = false;
let activeDownloadAttempt = null;
let updateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseName: null,
  releaseDate: null,
  releaseNotes: null,
  releaseSummary: null,
  releaseSections: null,
  releasePageUrl: null,
  manualDownloadUrl: null,
  downloadAttempt: null,
  maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
  retrying: false,
  errorKind: null,
  percent: null,
  message: '',
};

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const isDesktopUpdateSupported = () => app.isPackaged && process.platform === 'win32';

const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

const getUserGuideUrl = (language) => {
  if (language === 'zh-TW' || language === 'en') return USER_GUIDE_URLS[language];
  return USER_GUIDE_URLS['zh-CN'];
};

const normalizeUpdateInfo = (info = {}) => {
  const latestVersion = info.version || updateState.latestVersion || null;
  const remoteMetadata = getReleaseMetadataForUpdateInfo({ ...info, version: latestVersion });
  return {
    latestVersion,
    releaseName: info.releaseName || updateState.releaseName || null,
    releaseDate: info.releaseDate || updateState.releaseDate || null,
    releaseNotes: remoteMetadata.releaseNotes || updateState.releaseNotes || null,
    releaseSummary: remoteMetadata.releaseSummary,
    releaseSections: remoteMetadata.releaseSections,
    releasePageUrl: remoteMetadata.releasePageUrl,
    manualDownloadUrl: remoteMetadata.manualDownloadUrl,
  };
};

const getUpdaterState = (overrides = {}) => ({
  ...updateState,
  currentVersion: app.getVersion(),
  ...overrides,
});

const broadcastUpdaterState = (state) => {
  updateState = getUpdaterState(state);
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('hsl-updater:status', updateState);
    }
  }
  return updateState;
};

const getDesktopWindowState = (window) => ({
  maximized: Boolean(window && !window.isDestroyed() && window.isMaximized()),
  fullscreen: Boolean(window && !window.isDestroyed() && window.isFullScreen()),
});

const broadcastDesktopWindowState = (window) => {
  const state = getDesktopWindowState(window);
  if (window && !window.isDestroyed()) {
    window.webContents.send('hsl-window:state', state);
  }
  return state;
};

const getDesktopWindowFromEvent = (event) => (
  BrowserWindow.fromWebContents(event.sender)
);

const bindDesktopWindowFrameBehavior = (mainWindow) => {
  mainWindow.setAspectRatio(WORKBENCH_WINDOW_ASPECT_RATIO);

  let enforcingAspectRatio = false;
  const enforceAspectRatio = () => {
    if (
      enforcingAspectRatio
      || mainWindow.isDestroyed()
      || mainWindow.isMaximized()
      || mainWindow.isFullScreen()
    ) {
      return;
    }

    const [width, height] = mainWindow.getSize();
    const targetWidth = Math.max(width, WORKBENCH_WINDOW_MIN_WIDTH);
    const targetHeight = Math.max(
      WORKBENCH_WINDOW_MIN_HEIGHT,
      Math.round(targetWidth / WORKBENCH_WINDOW_ASPECT_RATIO),
    );

    if (targetWidth === width && Math.abs(targetHeight - height) <= 1) return;

    enforcingAspectRatio = true;
    mainWindow.setSize(targetWidth, targetHeight);
    enforcingAspectRatio = false;
  };

  mainWindow.on('resize', enforceAspectRatio);
  mainWindow.on('maximize', () => {
    broadcastDesktopWindowState(mainWindow);
  });
  mainWindow.on('unmaximize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.setSize(WORKBENCH_WINDOW_WIDTH, WORKBENCH_WINDOW_HEIGHT);
      mainWindow.center();
    }
    broadcastDesktopWindowState(mainWindow);
  });
  mainWindow.on('enter-full-screen', () => {
    broadcastDesktopWindowState(mainWindow);
  });
  mainWindow.on('leave-full-screen', () => {
    broadcastDesktopWindowState(mainWindow);
  });
};

autoUpdater.on('checking-for-update', () => {
  broadcastUpdaterState({
    status: 'checking',
    message: 'Checking for updates.',
    percent: null,
  });
});

autoUpdater.on('update-available', (info) => {
  broadcastUpdaterState({
    status: 'available',
    ...normalizeUpdateInfo(info),
    message: 'Update available.',
    percent: null,
  });
});

autoUpdater.on('update-not-available', (info) => {
  broadcastUpdaterState({
    status: 'not-available',
    ...normalizeUpdateInfo(info),
    message: 'The application is up to date.',
    percent: null,
  });
});

autoUpdater.on('download-progress', (progress) => {
  broadcastUpdaterState({
    status: 'downloading',
    percent: Number.isFinite(progress?.percent) ? progress.percent : null,
    downloadAttempt: activeDownloadAttempt,
    maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
    retrying: false,
    message: 'Downloading update.',
  });
});

autoUpdater.on('update-downloaded', (info) => {
  broadcastUpdaterState({
    status: 'downloaded',
    ...normalizeUpdateInfo(info),
    percent: 100,
    downloadAttempt: activeDownloadAttempt,
    maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
    retrying: false,
    errorKind: null,
    message: 'Update downloaded.',
  });
});

autoUpdater.on('error', (error) => {
  if (updateDownloadInProgress) return;
  broadcastUpdaterState({
    status: 'error',
    ...getReleaseMetadataForVersion(updateState.latestVersion),
    message: getErrorMessage(error),
    retrying: false,
    errorKind: isTransientUpdateError(error) ? 'network' : 'fatal',
    percent: null,
  });
});

const waitForUpdateRetry = (attempt) => new Promise((resolve) => {
  setTimeout(resolve, Math.min(800 * attempt, 2400));
});

const getAppIconPath = () => {
  const candidates = [
    path.join(process.resourcesPath || '', 'app-icon', 'icon.ico'),
    path.join(rootDir, 'resources', 'app-icon', 'icon.ico'),
  ];
  return candidates.find((candidate) => fsSync.existsSync(candidate));
};

const getSystemExporterCandidates = () => ([
  path.join(process.resourcesPath || '', 'exporter', 'hsl_exporter.py'),
  path.join(rootDir, 'tools', 'exporter', 'hsl_exporter.py'),
]);

const getBundledExporterCandidates = () => ([
  path.join(rootDir, 'resources', 'exporter', 'hsl-exporter.exe'),
  path.join(process.resourcesPath || '', 'exporter', 'hsl-exporter.exe'),
]);

const getDefaultExportRoot = () => path.join(app.getPath('documents'), exportRootFolderName);

const getRuntimeWorkingDirectory = () => {
  if (app.isPackaged && process.resourcesPath) {
    return process.resourcesPath;
  }
  if (rootDir.includes('.asar')) {
    return process.resourcesPath || app.getPath('temp');
  }
  try {
    if (fsSync.existsSync(rootDir) && fsSync.statSync(rootDir).isDirectory()) {
      return rootDir;
    }
  } catch {
    // Packaged apps can resolve rootDir to app.asar, which is not a cwd.
  }
  return process.resourcesPath || app.getPath('temp');
};

const runCommand = (command, args) => new Promise((resolve) => {
  const child = spawn(command, args, {
    cwd: getRuntimeWorkingDirectory(),
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.on('error', (error) => {
    resolve({
      code: -1,
      stdout,
      stderr: `${stderr}${error.message}`,
      error,
    });
  });
  child.on('close', (code) => {
    resolve({
      code: code ?? 1,
      stdout,
      stderr,
    });
  });
});

const getSystemRuntime = async () => {
  for (const candidate of getSystemExporterCandidates()) {
    try {
      await fs.access(candidate);
      return {
        kind: 'system',
        command: 'python',
        baseArgs: [candidate],
      };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

const getBundledRuntime = async () => {
  for (const candidate of getBundledExporterCandidates()) {
    try {
      await fs.access(candidate);
      return {
        kind: 'bundled',
        command: candidate,
        baseArgs: [],
      };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

const runExporter = (runtime, args) => (
  runCommand(runtime.command, [...runtime.baseArgs, ...args])
);

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const sanitizeName = (value) => (
  String(value || 'Heat Capacity Ratio Lab Export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 96) || 'Heat Capacity Ratio Lab Export'
);

const formatTimestampForFolder = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
};

const getExperimentFolderName = (payload, options) => {
  const source =
    options?.fileName
    || payload?.data?.fileName
    || payload?.filename
    || 'Heat Capacity Ratio Lab Experiment';
  return `${sanitizeName(source)}_${formatTimestampForFolder()}`;
};

const ensureDefaultExportRoot = async () => {
  const exportRoot = getDefaultExportRoot();
  await fs.mkdir(exportRoot, { recursive: true });
  return exportRoot;
};

const resolveExporterRuntime = async () => {
  const systemRuntime = await getSystemRuntime();
  if (systemRuntime) {
    const systemResult = await runExporter(systemRuntime, ['--self-check']);
    if (systemResult.code === 0) {
      const details = parseJson(systemResult.stdout);
      return {
        status: 'available-system',
        runtime: systemRuntime,
        message: details
          ? `Python ${details.python}, matplotlib ${details.matplotlib}, reportlab ${details.reportlab}`
          : 'System Python exporter is available.',
        stdout: systemResult.stdout,
        stderr: systemResult.stderr,
        details,
      };
    }
  }

  const bundledRuntime = await getBundledRuntime();
  if (bundledRuntime) {
    const bundledResult = await runExporter(bundledRuntime, ['--self-check']);
    if (bundledResult.code === 0) {
      const details = parseJson(bundledResult.stdout);
      return {
        status: 'available-bundled',
        runtime: bundledRuntime,
        message: details
          ? `Bundled exporter ready, matplotlib ${details.matplotlib}, reportlab ${details.reportlab}`
          : 'Bundled exporter is available.',
        stdout: bundledResult.stdout,
        stderr: bundledResult.stderr,
        details,
      };
    }

    return {
      status: 'error',
      runtime: null,
      message: bundledResult.stderr.trim() || 'Bundled exporter self-check failed.',
      stdout: bundledResult.stdout,
      stderr: bundledResult.stderr,
      details: null,
    };
  }

  return {
    status: 'unavailable',
    runtime: null,
    message: 'No working exporter was found. Install Python dependencies or build resources\\exporter\\hsl-exporter.exe.',
    stdout: '',
    stderr: '',
    details: null,
  };
};

const createMainWindow = async (options = {}) => {
  const mainWindow = new BrowserWindow({
    title: appTitle,
    width: WORKBENCH_WINDOW_WIDTH,
    height: WORKBENCH_WINDOW_HEIGHT,
    minWidth: WORKBENCH_WINDOW_MIN_WIDTH,
    minHeight: WORKBENCH_WINDOW_MIN_HEIGHT,
    frame: false,
    backgroundColor: '#20242a',
    icon: getAppIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      backgroundThrottling: false,
    },
  });
  bindDesktopWindowFrameBehavior(mainWindow);

  await mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'), options.fresh ? {
    query: { hslFreshWindow: '1' },
  } : undefined);

  return mainWindow;
};

ipcMain.handle('hsl-window:new', async () => {
  try {
    await createMainWindow({ fresh: true });
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('hsl-window:minimize', (event) => {
  const window = getDesktopWindowFromEvent(event);
  if (window && !window.isDestroyed()) {
    window.minimize();
  }
  return getDesktopWindowState(window);
});

ipcMain.handle('hsl-window:toggle-maximize', (event) => {
  const window = getDesktopWindowFromEvent(event);
  if (window && !window.isDestroyed()) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
  return getDesktopWindowState(window);
});

ipcMain.handle('hsl-window:close', (event) => {
  const window = getDesktopWindowFromEvent(event);
  if (window && !window.isDestroyed()) {
    window.close();
  }
  return { status: 'closed' };
});

ipcMain.handle('hsl-window:get-state', (event) => (
  getDesktopWindowState(getDesktopWindowFromEvent(event))
));

ipcMain.handle('hsl-updater:check', async () => {
  if (!isDesktopUpdateSupported()) {
    return broadcastUpdaterState({
      status: 'unsupported',
      message: 'Automatic updates are available only in the packaged Windows desktop app.',
      percent: null,
    });
  }

  if (updateCheckPromise) {
    return updateState;
  }

  updateCheckPromise = autoUpdater.checkForUpdates()
    .catch((error) => {
      broadcastUpdaterState({
        status: 'error',
        ...getReleaseMetadataForVersion(updateState.latestVersion),
        message: getErrorMessage(error),
        retrying: false,
        errorKind: isTransientUpdateError(error) ? 'network' : 'fatal',
        percent: null,
      });
      return null;
    })
    .finally(() => {
      updateCheckPromise = null;
    });

  await updateCheckPromise;
  return updateState;
});

ipcMain.handle('hsl-updater:download', async () => {
  if (!isDesktopUpdateSupported()) {
    return broadcastUpdaterState({
      status: 'unsupported',
      message: 'Automatic updates are available only in the packaged Windows desktop app.',
      percent: null,
    });
  }

  updateDownloadInProgress = true;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
    activeDownloadAttempt = attempt;
    broadcastUpdaterState({
      status: 'downloading',
      ...getReleaseMetadataForVersion(updateState.latestVersion),
      message: 'Downloading update.',
      percent: 0,
      downloadAttempt: attempt,
      maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
      retrying: false,
      errorKind: null,
    });

    try {
      await autoUpdater.downloadUpdate();
      updateDownloadInProgress = false;
      activeDownloadAttempt = null;
      return updateState;
    } catch (error) {
      const retryable = isTransientUpdateError(error);
      const message = getErrorMessage(error);
      if (!retryable || attempt >= MAX_DOWNLOAD_ATTEMPTS) {
        updateDownloadInProgress = false;
        activeDownloadAttempt = null;
        return broadcastUpdaterState({
          status: 'error',
          ...getReleaseMetadataForVersion(updateState.latestVersion),
          message,
          percent: null,
          downloadAttempt: attempt,
          maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
          retrying: false,
          errorKind: retryable ? 'network' : 'fatal',
        });
      }

      const nextAttempt = attempt + 1;
      broadcastUpdaterState({
        status: 'retrying',
        ...getReleaseMetadataForVersion(updateState.latestVersion),
        message,
        percent: null,
        downloadAttempt: nextAttempt,
        maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
        retrying: true,
        errorKind: 'network',
      });
      await waitForUpdateRetry(nextAttempt);
    }
  }

  updateDownloadInProgress = false;
  activeDownloadAttempt = null;
  return updateState;
});

ipcMain.handle('hsl-updater:quit-and-install', async () => {
  if (!isDesktopUpdateSupported()) {
    return broadcastUpdaterState({
      status: 'unsupported',
      message: 'Automatic updates are available only in the packaged Windows desktop app.',
      percent: null,
    });
  }

  broadcastUpdaterState({
    status: 'installing',
    message: 'Restarting to install update.',
    percent: 100,
  });
  autoUpdater.quitAndInstall(false, true);
  return updateState;
});

ipcMain.handle('hsl-updater:open-manual-download', async () => {
  const targetUrl = updateState.manualDownloadUrl || updateState.releasePageUrl;
  if (!isAllowedManualDownloadUrl(targetUrl)) {
    return {
      status: 'error',
      message: 'Manual download URL is unavailable or not trusted.',
    };
  }

  await shell.openExternal(targetUrl);
  return {
    status: 'opened',
    url: targetUrl,
  };
});

ipcMain.handle('hsl-user-guide:open', async (_event, language) => {
  const targetUrl = getUserGuideUrl(language);
  await shell.openExternal(targetUrl);
  return {
    status: 'opened',
    url: targetUrl,
  };
});

ipcMain.handle('hsl-exporter:check', async () => {
  await ensureDefaultExportRoot();
  const result = await resolveExporterRuntime();
  selectedExporterRuntime = result.runtime;
  return {
    status: result.status,
    message: result.message,
    stdout: result.stdout,
    stderr: result.stderr,
    details: result.details,
  };
});

ipcMain.handle('hsl-exporter:export', async (_event, payload, options = {}) => {
  if (!payload || typeof payload !== 'object' || !('kind' in payload)) {
    return {
      status: 'error',
      message: 'Invalid export payload.',
    };
  }

  if (payload.kind !== 'json' && payload.kind !== 'csv') {
    return {
      status: 'error',
      message: `Unsupported export payload kind: ${payload.kind}`,
    };
  }

  const defaultPath = await ensureDefaultExportRoot();
  const selection = await dialog.showOpenDialog({
    title: 'Choose Heat Capacity Ratio Lab Export Root Folder',
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (selection.canceled || selection.filePaths.length === 0) {
    return { status: 'cancelled' };
  }

  const outDir = path.join(selection.filePaths[0], getExperimentFolderName(payload, options));
  await fs.mkdir(outDir, { recursive: true });

  if (payload.kind === 'csv') {
    const dataDir = path.join(outDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const target = path.join(dataDir, sanitizeName(payload.filename || 'heat-capacity-ratio-lab.csv'));
    await fs.writeFile(target, payload.content || '', 'utf8');
    return {
      status: 'ok',
      outDir,
      files: [target],
      metadataPath: null,
      stdout: '',
      stderr: '',
      runtime: 'desktop-file-writer',
    };
  }

  const tempDir = path.join(os.tmpdir(), 'heat-capacity-ratio-lab-export');
  await fs.mkdir(tempDir, { recursive: true });
  const inputPath = path.join(tempDir, `${Date.now()}-${sanitizeName(payload.filename || 'payload.json')}`);
  await fs.writeFile(inputPath, JSON.stringify(payload, null, 2), 'utf8');

  if (!selectedExporterRuntime) {
    const runtimeResult = await resolveExporterRuntime();
    selectedExporterRuntime = runtimeResult.runtime;
    if (!selectedExporterRuntime) {
      return {
        status: 'error',
        outDir,
        message: runtimeResult.message,
        stdout: runtimeResult.stdout,
        stderr: runtimeResult.stderr,
      };
    }
  }

  const result = await runExporter(selectedExporterRuntime, ['--input', inputPath, '--out', outDir]);
  const parsed = parseJson(result.stdout);

  if (result.code !== 0 || !parsed || parsed.status !== 'ok') {
    return {
      status: 'error',
      outDir,
      message: result.stderr.trim() || 'Python exporter failed.',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  return {
    status: 'ok',
    outDir,
    metadataPath: parsed.metadata || null,
    files: Array.isArray(parsed.files) ? parsed.files : [],
    stdout: result.stdout,
    stderr: result.stderr,
    runtime: selectedExporterRuntime.kind,
  };
});

app.whenReady().then(async () => {
  app.setName(appTitle);
  Menu.setApplicationMenu(null);
  await ensureDefaultExportRoot();
  await createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
