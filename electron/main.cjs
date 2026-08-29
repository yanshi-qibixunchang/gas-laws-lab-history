const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { ensureLegacyUserDataPath } = require('./legacyUserDataPath.cjs');
ensureLegacyUserDataPath(app);

const { autoUpdater } = require('electron-updater');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const {
  MAX_DOWNLOAD_ATTEMPTS,
  getManualRecoveryTargetUrl,
  getReleaseMetadataForUpdateInfo,
  getReleaseMetadataForVersion,
  isAllowedManualDownloadUrl,
  isTransientUpdateError,
} = require('./updaterMetadata.cjs');
const {
  canStartUpdaterStage,
  canTransitionUpdaterStatus,
  createUpdaterOperationCoordinator,
} = require('./updaterStateMachine.cjs');
const { createExitPersistenceCoordinator } = require('./exitPersistenceCoordinator.cjs');
const { validateExporterOutputManifest } = require('./exporterOutputPolicy.cjs');
const {
  createPersistentWorkbenchWindowNamespace,
  createWorkbenchWindowRegistry,
} = require('./workbenchWindowRegistry.cjs');

const rootDir = path.resolve(__dirname, '..');
const preloadPath = path.join(__dirname, 'preload.cjs');
const appTitle = 'Gas Laws Lab';
const WORKBENCH_WINDOW_WIDTH = 1440;
const WORKBENCH_WINDOW_HEIGHT = 810;
const WORKBENCH_WINDOW_MIN_WIDTH = 1280;
const WORKBENCH_WINDOW_MIN_HEIGHT = 720;
const WORKBENCH_WINDOW_ASPECT_RATIO = 16 / 9;
const WORKBENCH_MAIN_NAMESPACE = 'persistent:main';
const WORKBENCH_WINDOW_REGISTRY_FILE_NAME = 'workbench-window-registry-v1.json';
// Keep the renderer quiesced until the updater-only NSIS close/kill fallback has
// either finished or definitively failed, so no resumed edits can be force-closed.
const UPDATE_INSTALL_EXIT_WATCHDOG_MS = 20_000;
const UPDATE_INSTALL_APPROVAL_TIMEOUT_MS = UPDATE_INSTALL_EXIT_WATCHDOG_MS + 2_000;
const exportRootFolderName = 'Gas Laws Lab Exports';
const USER_GUIDE_URLS = {
  'zh-CN': 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release#readme',
  'zh-TW': 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/blob/main/README.zh-TW.md',
  en: 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/blob/main/README.en.md',
};
const LEGAL_FILE_NAMES = {
  dependencies: 'third-party-dependencies.html',
  licenseTexts: 'third-party-license-texts.html',
  electron: 'LICENSE.electron.txt',
  fonts: 'font-licenses.txt',
  exporter: 'exporter-licenses.html',
  audio: 'audio-materials.html',
};
let selectedExporterRuntime = null;
let updateDownloadInProgress = false;
let activeDownloadAttempt = null;
let workbenchWindowRegistry = null;
let activeTutorialWindowId = null;
let pendingTutorialArchivedNamespaces = [];
let pendingTutorialArchivedWindowIds = [];
const updaterOperationCoordinator = createUpdaterOperationCoordinator();
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
  errorStage: null,
  percent: null,
  message: '',
};
const exitPersistenceCoordinator = createExitPersistenceCoordinator({
  dialog,
});

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.disableWebInstaller = true;

const isDesktopUpdateSupported = () => app.isPackaged && process.platform === 'win32';

const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

const getUserGuideUrl = (language) => {
  if (language === 'zh-TW' || language === 'en') return USER_GUIDE_URLS[language];
  return USER_GUIDE_URLS['zh-CN'];
};

const getLegalDirectoryCandidates = () => ([
  path.join(process.resourcesPath || '', 'legal'),
  path.join(rootDir, 'public', 'legal'),
]);

const findExistingFile = (candidates) => (
  candidates.find((candidate) => {
    try {
      return fsSync.existsSync(candidate) && fsSync.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) || null
);

const getChromiumLicensePath = () => findExistingFile([
  path.join(path.dirname(process.execPath), 'LICENSES.chromium.html'),
  path.join(process.resourcesPath || '', '..', 'LICENSES.chromium.html'),
  path.join(rootDir, 'node_modules', 'electron', 'dist', 'LICENSES.chromium.html'),
  path.join(rootDir, 'release', 'win-unpacked', 'LICENSES.chromium.html'),
]);

const resolveLegalFilePath = (fileId) => {
  if (fileId === 'chromium') return getChromiumLicensePath();

  const fileName = LEGAL_FILE_NAMES[fileId];
  if (!fileName) return null;

  return findExistingFile(
    getLegalDirectoryCandidates().map((directory) => path.join(directory, fileName)),
  );
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

const getKnownUpdateReleaseMetadata = () => {
  const packagedMetadata = getReleaseMetadataForVersion(updateState.latestVersion);
  return {
    releaseNotes: updateState.releaseNotes ?? packagedMetadata.releaseNotes ?? null,
    releaseSummary: updateState.releaseSummary ?? packagedMetadata.releaseSummary,
    releaseSections: updateState.releaseSections ?? packagedMetadata.releaseSections,
    releasePageUrl: updateState.releasePageUrl ?? packagedMetadata.releasePageUrl,
    manualDownloadUrl: updateState.manualDownloadUrl ?? packagedMetadata.manualDownloadUrl,
  };
};

const getUpdaterState = (overrides = {}) => ({
  ...updateState,
  currentVersion: app.getVersion(),
  ...overrides,
});

const broadcastUpdaterState = (state) => {
  const nextStatus = state.status ?? updateState.status;
  if (!canTransitionUpdaterStatus(updateState.status, nextStatus)) return updateState;
  updateState = getUpdaterState(state);
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('hsl-updater:status', updateState);
    }
  }
  return updateState;
};

const runUpdaterStage = (stage, taskFactory) => {
  const activeStage = updaterOperationCoordinator.activeStage;
  if (activeStage !== null && activeStage !== stage) return Promise.resolve(updateState);
  if (activeStage === null && !canStartUpdaterStage(stage, updateState)) {
    return Promise.resolve(updateState);
  }
  return updaterOperationCoordinator.run(stage, taskFactory);
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
  if (updaterOperationCoordinator.activeStage !== 'check') return;
  broadcastUpdaterState({
    status: 'checking',
    message: 'Checking for updates.',
    percent: null,
    errorStage: null,
  });
});

autoUpdater.on('update-available', (info) => {
  if (updaterOperationCoordinator.activeStage !== 'check') return;
  broadcastUpdaterState({
    status: 'available',
    ...normalizeUpdateInfo(info),
    message: 'Update available.',
    percent: null,
    errorStage: null,
  });
});

autoUpdater.on('update-not-available', (info) => {
  if (updaterOperationCoordinator.activeStage !== 'check') return;
  broadcastUpdaterState({
    status: 'not-available',
    ...normalizeUpdateInfo(info),
    message: 'The application is up to date.',
    percent: null,
    errorStage: null,
  });
});

autoUpdater.on('download-progress', (progress) => {
  if (updaterOperationCoordinator.activeStage !== 'download') return;
  broadcastUpdaterState({
    status: 'downloading',
    ...getKnownUpdateReleaseMetadata(),
    percent: Number.isFinite(progress?.percent) ? progress.percent : null,
    downloadAttempt: activeDownloadAttempt,
    maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
    retrying: false,
    errorStage: null,
    message: 'Downloading update.',
  });
});

autoUpdater.on('update-downloaded', (info) => {
  if (updaterOperationCoordinator.activeStage !== 'download') return;
  broadcastUpdaterState({
    status: 'downloaded',
    ...normalizeUpdateInfo(info),
    percent: 100,
    downloadAttempt: activeDownloadAttempt,
    maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
    retrying: false,
    errorKind: null,
    errorStage: null,
    message: 'Update downloaded.',
  });
});

autoUpdater.on('error', (error) => {
  if (updateDownloadInProgress) return;
  if (updaterOperationCoordinator.activeStage !== 'check') return;
  broadcastUpdaterState({
    status: 'error',
    ...getKnownUpdateReleaseMetadata(),
    message: getErrorMessage(error),
    retrying: false,
    errorKind: isTransientUpdateError(error) ? 'network' : 'fatal',
    errorStage: 'check',
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
  ...(app.isPackaged
    ? [path.join(process.resourcesPath || '', 'exporter', 'hsl-exporter.exe')]
    : [path.join(rootDir, 'resources', 'exporter', 'hsl-exporter.exe')]),
  ...(app.isPackaged
    ? [path.join(rootDir, 'resources', 'exporter', 'hsl-exporter.exe')]
    : [path.join(process.resourcesPath || '', 'exporter', 'hsl-exporter.exe')]),
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
  String(value || 'Gas Laws Lab Export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 96) || 'Gas Laws Lab Export'
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
    options?.defaultDirName
    || options?.fileName
    || payload?.data?.fileName
    || payload?.filename
    || 'Gas Laws Lab Experiment';
  return `${sanitizeName(source)}_${formatTimestampForFolder()}`;
};

const isIdealExportPayload = (payload) => Boolean(
  payload?.data?.relation
  && Array.isArray(payload?.data?.points)
);

const getIdealExportPointCount = (payload) => {
  if (Array.isArray(payload?.data?.points)) {
    return payload.data.points.length;
  }
  return 0;
};

const getExporterFormatsForMode = (mode, payload) => {
  switch (mode) {
    case 'report':
      return 'report';
    case 'verificationFigure':
    case 'figuresZip':
      return 'figures';
    case 'completeBundle':
      if (isIdealExportPayload(payload) && getIdealExportPointCount(payload) < 2) {
        return 'csv,metadata';
      }
      return 'report,figures,csv,metadata';
    default:
      return 'report,figures,csv,metadata';
  }
};

const getReportExportFilename = (payload, options) => {
  const source = payload?.filename || options?.fileName || payload?.data?.fileName || 'report.pdf';
  const pdfName = String(source)
    .replace(/\.bundle\.json$/i, '.pdf')
    .replace(/\.figures\.json$/i, '.pdf')
    .replace(/\.json$/i, '.pdf');
  return sanitizeName(pdfName.toLowerCase().endsWith('.pdf') ? pdfName : `${pdfName}.pdf`);
};

const ensureDefaultExportRoot = async () => {
  const exportRoot = getDefaultExportRoot();
  await fs.mkdir(exportRoot, { recursive: true });
  return exportRoot;
};

const replaceFileAtomically = async (source, target) => {
  const temporaryTarget = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp`,
  );
  try {
    await fs.copyFile(source, temporaryTarget, fsSync.constants.COPYFILE_EXCL);
    await fs.rename(temporaryTarget, target);
  } finally {
    await fs.rm(temporaryTarget, { force: true });
  }
};

const resolveBundledExporterRuntime = async () => {
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

  return null;
};

const resolveExporterRuntime = async () => {
  if (app.isPackaged) {
    const packagedBundledResult = await resolveBundledExporterRuntime();
    return packagedBundledResult ?? {
      status: 'unavailable',
      runtime: null,
      message: 'The packaged exporter is missing from the installed application resources.',
      stdout: '',
      stderr: '',
      details: null,
    };
  }

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

  const bundledResult = await resolveBundledExporterRuntime();
  if (bundledResult) return bundledResult;

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
  const namespace = options.namespace ?? WORKBENCH_MAIN_NAMESPACE;
  const mainWindow = new BrowserWindow({
    title: appTitle,
    width: WORKBENCH_WINDOW_WIDTH,
    height: WORKBENCH_WINDOW_HEIGHT,
    minWidth: WORKBENCH_WINDOW_MIN_WIDTH,
    minHeight: WORKBENCH_WINDOW_MIN_HEIGHT,
    frame: false,
    backgroundColor: '#1a1f25',
    icon: getAppIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: preloadPath,
      backgroundThrottling: false,
    },
  });
  bindDesktopWindowFrameBehavior(mainWindow);
  exitPersistenceCoordinator.bindWindow(mainWindow, {
    beforeApprovedClose: namespace === WORKBENCH_MAIN_NAMESPACE
      ? undefined
      : async () => {
          if (!workbenchWindowRegistry) {
            throw new Error('Workbench window registry is not ready.');
          }
          await workbenchWindowRegistry.remove(namespace);
        },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (targetUrl !== currentUrl) event.preventDefault();
  });

  await mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'), {
    query: {
      hslWorkspaceNamespace: namespace,
      ...(options.fresh ? { hslFreshWindow: '1' } : {}),
    },
  });

  return mainWindow;
};

ipcMain.handle('hsl-window:new', async () => {
  if (activeTutorialWindowId !== null) {
    return {
      status: 'error',
      message: 'Complete the current learning flow before opening another workbench window.',
    };
  }
  const namespace = createPersistentWorkbenchWindowNamespace(randomUUID);
  try {
    if (!workbenchWindowRegistry) {
      throw new Error('Workbench window registry is not ready.');
    }
    await workbenchWindowRegistry.add(namespace);
    try {
      await createMainWindow({ fresh: true, namespace });
    } catch (error) {
      await workbenchWindowRegistry.remove(namespace);
      throw error;
    }
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

ipcMain.handle('hsl-window:close', async (event) => {
  const window = getDesktopWindowFromEvent(event);
  if (!window || window.isDestroyed()) return { status: 'closed' };
  return exitPersistenceCoordinator.requestWindowClose(window, 'custom-close');
});

const getWorkbenchWindowNamespace = (window) => {
  try {
    return new URL(window.webContents.getURL()).searchParams.get('hslWorkspaceNamespace');
  } catch {
    return null;
  }
};

const getPendingTutorialArchivedWindows = () => (
  pendingTutorialArchivedWindowIds.flatMap((windowId) => {
    const window = BrowserWindow.fromId(windowId);
    return window && !window.isDestroyed() ? [window] : [];
  })
);

const clearPendingTutorialArchive = (resumeReason = null) => {
  if (resumeReason) {
    exitPersistenceCoordinator.resumeWindowsAfterExitCancellation(
      getPendingTutorialArchivedWindows(),
      resumeReason,
    );
  }
  pendingTutorialArchivedNamespaces = [];
  pendingTutorialArchivedWindowIds = [];
};

ipcMain.handle('hsl-tutorial:activate', async (event) => {
  const ownerWindow = getDesktopWindowFromEvent(event);
  if (!ownerWindow || ownerWindow.isDestroyed()) {
    return { status: 'error', message: 'Tutorial owner window is unavailable.' };
  }
  if (activeTutorialWindowId !== null && activeTutorialWindowId !== ownerWindow.id) {
    return { status: 'blocked', message: 'The learning flow is already active in another window.' };
  }
  if (activeTutorialWindowId === ownerWindow.id) {
    return { status: 'ok', archivedNamespaces: [...pendingTutorialArchivedNamespaces] };
  }
  const otherWindows = BrowserWindow.getAllWindows().filter((window) => (
    !window.isDestroyed() && window.id !== ownerWindow.id
  ));
  const persistence = await exitPersistenceCoordinator.prepareWindowsForExit(
    otherWindows,
    'tutorial-lock',
  );
  if (!persistence.proceed) {
    return { status: 'error', message: 'Another workbench window could not be saved safely.' };
  }
  pendingTutorialArchivedNamespaces = otherWindows
    .map(getWorkbenchWindowNamespace)
    .filter((namespace) => typeof namespace === 'string');
  pendingTutorialArchivedWindowIds = otherWindows.map((window) => window.id);
  activeTutorialWindowId = ownerWindow.id;
  ownerWindow.once('closed', () => {
    if (activeTutorialWindowId !== ownerWindow.id) return;
    clearPendingTutorialArchive('tutorial-owner-closed-before-activation');
    activeTutorialWindowId = null;
  });
  return { status: 'ok', archivedNamespaces: [...pendingTutorialArchivedNamespaces] };
});

ipcMain.handle('hsl-tutorial:finalize-activation', async (event, namespaces) => {
  const ownerWindow = getDesktopWindowFromEvent(event);
  if (!ownerWindow || activeTutorialWindowId !== ownerWindow.id) {
    return { status: 'error', message: 'Tutorial owner window is unavailable.' };
  }
  const requestedNamespaces = Array.isArray(namespaces)
    ? namespaces.filter((namespace) => typeof namespace === 'string')
    : [];
  if (
    requestedNamespaces.length !== pendingTutorialArchivedNamespaces.length ||
    requestedNamespaces.some((namespace) => !pendingTutorialArchivedNamespaces.includes(namespace))
  ) {
    return { status: 'error', message: 'Tutorial archive namespace set does not match.' };
  }
  try {
    if (workbenchWindowRegistry) {
      for (const namespace of requestedNamespaces) {
        if (namespace !== WORKBENCH_MAIN_NAMESPACE) {
          await workbenchWindowRegistry.remove(namespace);
        }
      }
    }
    const archivedWindows = getPendingTutorialArchivedWindows();
    exitPersistenceCoordinator.approveWindowsForExit(archivedWindows);
    archivedWindows.forEach((window) => {
      if (!window.isDestroyed()) window.close();
    });
    clearPendingTutorialArchive();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: getErrorMessage(error) };
  }
});

ipcMain.handle('hsl-tutorial:deactivate', (event) => {
  const ownerWindow = getDesktopWindowFromEvent(event);
  if (ownerWindow && activeTutorialWindowId === ownerWindow.id) {
    clearPendingTutorialArchive('tutorial-activation-cancelled');
    activeTutorialWindowId = null;
  }
  return { status: 'ok' };
});

ipcMain.handle('hsl-tutorial:get-state', (event) => {
  const ownerWindow = getDesktopWindowFromEvent(event);
  return {
    active: activeTutorialWindowId !== null,
    owner: Boolean(ownerWindow && ownerWindow.id === activeTutorialWindowId),
  };
});

ipcMain.handle('hsl-tutorial:exit-application', () => {
  const windows = BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());
  exitPersistenceCoordinator.approveWindowsForExit(windows);
  windows.forEach((window) => {
    if (!window.isDestroyed()) window.close();
  });
  return { status: 'ok' };
});

ipcMain.handle('hsl-lifecycle:persistence-result', (event, payload) => (
  exitPersistenceCoordinator.handleRendererResult(event, payload)
));

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

  return runUpdaterStage('check', async () => {
    broadcastUpdaterState({
      status: 'checking',
      message: 'Checking for updates.',
      percent: null,
      errorKind: null,
      errorStage: null,
    });
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      broadcastUpdaterState({
        status: 'error',
        ...getKnownUpdateReleaseMetadata(),
        message: getErrorMessage(error),
        retrying: false,
        errorKind: isTransientUpdateError(error) ? 'network' : 'fatal',
        errorStage: 'check',
        percent: null,
      });
    }
    return updateState;
  });
});

ipcMain.handle('hsl-updater:download', async () => {
  if (!isDesktopUpdateSupported()) {
    return broadcastUpdaterState({
      status: 'unsupported',
      message: 'Automatic updates are available only in the packaged Windows desktop app.',
      percent: null,
    });
  }

  return runUpdaterStage('download', async () => {
    updateDownloadInProgress = true;
    try {
      for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
        activeDownloadAttempt = attempt;
        broadcastUpdaterState({
          status: 'downloading',
          ...getKnownUpdateReleaseMetadata(),
          message: 'Downloading update.',
          percent: 0,
          downloadAttempt: attempt,
          maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
          retrying: false,
          errorKind: null,
          errorStage: null,
        });

        try {
          await autoUpdater.downloadUpdate();
          return updateState;
        } catch (error) {
          const retryable = isTransientUpdateError(error);
          const message = getErrorMessage(error);
          if (!retryable || attempt >= MAX_DOWNLOAD_ATTEMPTS) {
            return broadcastUpdaterState({
              status: 'error',
              ...getKnownUpdateReleaseMetadata(),
              message,
              percent: null,
              downloadAttempt: attempt,
              maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
              retrying: false,
              errorKind: retryable ? 'network' : 'fatal',
              errorStage: 'download',
            });
          }

          const nextAttempt = attempt + 1;
          broadcastUpdaterState({
            status: 'retrying',
            ...getKnownUpdateReleaseMetadata(),
            message,
            percent: null,
            downloadAttempt: nextAttempt,
            maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
            retrying: true,
            errorKind: 'network',
            errorStage: null,
          });
          await waitForUpdateRetry(nextAttempt);
        }
      }
      return updateState;
    } finally {
      updateDownloadInProgress = false;
      activeDownloadAttempt = null;
    }
  });
});

ipcMain.handle('hsl-updater:quit-and-install', async () => {
  if (!isDesktopUpdateSupported()) {
    return broadcastUpdaterState({
      status: 'unsupported',
      message: 'Automatic updates are available only in the packaged Windows desktop app.',
      percent: null,
    });
  }

  return runUpdaterStage('install', async () => {
    const windows = BrowserWindow.getAllWindows();
    const persistence = await exitPersistenceCoordinator.prepareWindowsForExit(
      windows,
      'update-install',
    );
    if (!persistence.proceed) {
      return broadcastUpdaterState({
        status: 'downloaded',
        message: 'Restart cancelled because workspace persistence did not complete.',
        percent: 100,
      });
    }

    broadcastUpdaterState({
      status: 'installing',
      message: 'Restarting to install update.',
      percent: 100,
      errorStage: null,
    });
    const revokeExitApproval = exitPersistenceCoordinator.approveWindowsForExit(
      windows,
      UPDATE_INSTALL_APPROVAL_TIMEOUT_MS,
    );
    return new Promise((resolve) => {
      const handleWillQuit = () => {
        clearTimeout(quitAndInstallWatchdogId);
        resolve(updateState);
      };
      const completeWithoutExit = (reason, nextState) => {
        clearTimeout(quitAndInstallWatchdogId);
        app.removeListener('will-quit', handleWillQuit);
        revokeExitApproval(reason);
        resolve(nextState);
      };
      const quitAndInstallWatchdogId = setTimeout(() => {
        completeWithoutExit(
          'update-install-did-not-exit',
          broadcastUpdaterState({
            status: 'downloaded',
            message: 'The update is ready, but the app did not restart. Please try again.',
            percent: 100,
            errorKind: 'install-restart',
          }),
        );
      }, UPDATE_INSTALL_EXIT_WATCHDOG_MS);
      app.once('will-quit', handleWillQuit);
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        completeWithoutExit(
          'update-install-failed',
          broadcastUpdaterState({
            status: 'downloaded',
            message: `The update is ready, but restart failed: ${getErrorMessage(error)}`,
            percent: 100,
            errorKind: 'install-restart',
          }),
        );
      }
    });
  });
});

ipcMain.handle('hsl-updater:open-manual-download', async () => {
  const targetUrl = getManualRecoveryTargetUrl(updateState);
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

ipcMain.handle('hsl-legal:open-file', async (_event, fileId) => {
  const targetPath = resolveLegalFilePath(fileId);
  if (!targetPath) {
    return {
      status: 'error',
      message: 'The requested legal file is unavailable.',
    };
  }

  const message = await shell.openPath(targetPath);
  if (message) {
    return {
      status: 'error',
      path: targetPath,
      message,
    };
  }

  return {
    status: 'opened',
    path: targetPath,
  };
});

ipcMain.handle('hsl-legal:read-file', async (_event, fileId) => {
  const targetPath = resolveLegalFilePath(fileId);
  if (!targetPath) {
    return {
      status: 'error',
      message: 'The requested legal file is unavailable.',
    };
  }

  try {
    const content = await fs.readFile(targetPath, 'utf8');
    return {
      status: 'ok',
      path: targetPath,
      content,
      mimeType: path.extname(targetPath).toLowerCase() === '.html' ? 'text/html' : 'text/plain',
    };
  } catch (error) {
    return {
      status: 'error',
      path: targetPath,
      message: getErrorMessage(error),
    };
  }
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

  if (payload.kind === 'json' && options?.mode === 'report') {
    const selection = await dialog.showSaveDialog({
      title: 'Export Report PDF',
      defaultPath: path.join(defaultPath, getReportExportFilename(payload, options)),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (selection.canceled || !selection.filePath) {
      return { status: 'cancelled' };
    }

    if (!selectedExporterRuntime) {
      const runtimeResult = await resolveExporterRuntime();
      selectedExporterRuntime = runtimeResult.runtime;
      if (!selectedExporterRuntime) {
        return {
          status: 'error',
          outDir: path.dirname(selection.filePath),
          message: runtimeResult.message,
          stdout: runtimeResult.stdout,
          stderr: runtimeResult.stderr,
        };
      }
    }

    const tempDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'heat-capacity-ratio-lab-export-'));
    try {
      const inputPath = path.join(tempDir, `${Date.now()}-${sanitizeName(payload.filename || 'payload.json')}`);
      const outDir = path.join(tempDir, 'out');
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(inputPath, JSON.stringify(payload, null, 2), 'utf8');

      const result = await runExporter(selectedExporterRuntime, ['--input', inputPath, '--out', outDir, '--formats', 'report']);
      const parsed = parseJson(result.stdout);

      if (result.code !== 0 || !parsed || parsed.status !== 'ok') {
        return {
          status: 'error',
          outDir: path.dirname(selection.filePath),
          message: result.stderr.trim() || 'Python exporter failed.',
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }

      let outputManifest;
      try {
        outputManifest = await validateExporterOutputManifest({ fs, outDir, parsed });
      } catch (error) {
        return {
          status: 'error',
          outDir: path.dirname(selection.filePath),
          message: `Python exporter returned an unsafe output manifest: ${getErrorMessage(error)}`,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }
      const reportFiles = outputManifest.files.filter((file) => file.toLowerCase().endsWith('.pdf'));
      if (reportFiles.length !== 1 || outputManifest.files.length !== 1 || outputManifest.metadataPath !== null) {
        return {
          status: 'error',
          outDir: path.dirname(selection.filePath),
          message: 'Python exporter did not return exactly one report PDF.',
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }

      const target = selection.filePath.toLowerCase().endsWith('.pdf')
        ? selection.filePath
        : `${selection.filePath}.pdf`;
      await replaceFileAtomically(reportFiles[0], target);
      return {
        status: 'ok',
        outDir: path.dirname(target),
        metadataPath: null,
        files: [target],
        stdout: result.stdout,
        stderr: result.stderr,
        runtime: selectedExporterRuntime.kind,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  const selection = await dialog.showOpenDialog({
    title: 'Choose Gas Laws Lab Export Root Folder',
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (selection.canceled || selection.filePaths.length === 0) {
    return { status: 'cancelled' };
  }

  const selectedRoot = await fs.realpath(selection.filePaths[0]);
  if (payload.kind === 'json' && !selectedExporterRuntime) {
    const runtimeResult = await resolveExporterRuntime();
    selectedExporterRuntime = runtimeResult.runtime;
    if (!selectedExporterRuntime) {
      return {
        status: 'error',
        outDir: selectedRoot,
        message: runtimeResult.message,
        stdout: runtimeResult.stdout,
        stderr: runtimeResult.stderr,
      };
    }
  }

  const outDir = await fs.mkdtemp(path.join(
    selectedRoot,
    `${getExperimentFolderName(payload, options)}_`,
  ));
  let retainExportDirectory = false;
  try {
    if (payload.kind === 'csv') {
      const dataDir = path.join(outDir, 'data');
      await fs.mkdir(dataDir, { recursive: true });
      const target = path.join(dataDir, sanitizeName(payload.filename || 'heat-capacity-ratio-lab.csv'));
      await fs.writeFile(target, payload.content || '', 'utf8');
      retainExportDirectory = true;
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

    const tempDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'heat-capacity-ratio-lab-export-'));
    try {
      const inputPath = path.join(tempDir, `${Date.now()}-${sanitizeName(payload.filename || 'payload.json')}`);
      await fs.writeFile(inputPath, JSON.stringify(payload, null, 2), 'utf8');
      const result = await runExporter(selectedExporterRuntime, [
        '--input', inputPath,
        '--out', outDir,
        '--formats', getExporterFormatsForMode(options?.mode, payload),
      ]);
      const parsed = parseJson(result.stdout);

      if (result.code !== 0 || !parsed || parsed.status !== 'ok') {
        return {
          status: 'error',
          outDir: selectedRoot,
          message: result.stderr.trim() || 'Python exporter failed.',
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }

      let outputManifest;
      try {
        outputManifest = await validateExporterOutputManifest({ fs, outDir, parsed });
      } catch (error) {
        return {
          status: 'error',
          outDir: selectedRoot,
          message: `Python exporter returned an unsafe output manifest: ${getErrorMessage(error)}`,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }

      retainExportDirectory = true;
      return {
        status: 'ok',
        outDir: outputManifest.outDir,
        metadataPath: outputManifest.metadataPath,
        files: outputManifest.files,
        stdout: result.stdout,
        stderr: result.stderr,
        runtime: selectedExporterRuntime.kind,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } finally {
    if (!retainExportDirectory) {
      await fs.rm(outDir, { recursive: true, force: true });
    }
  }
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

const restoreRegisteredWorkbenchWindows = async () => {
  await createMainWindow({ namespace: WORKBENCH_MAIN_NAMESPACE });
  if (!workbenchWindowRegistry) return;
  let registry;
  try {
    registry = await workbenchWindowRegistry.read();
  } catch (error) {
    console.error('[Workbench windows] Persistent window registry could not be read.', error);
    return;
  }
  for (const namespace of registry.namespaces) {
    try {
      await createMainWindow({ fresh: true, namespace });
    } catch (error) {
      console.error(`[Workbench windows] Persistent window could not be restored: ${namespace}.`, error);
    }
  }
};

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const existingWindow = BrowserWindow.getFocusedWindow()
      ?? BrowserWindow.getAllWindows().find((window) => !window.isDestroyed());
    if (!existingWindow || existingWindow.isDestroyed()) return;
    if (existingWindow.isMinimized()) existingWindow.restore();
    existingWindow.show();
    existingWindow.focus();
  });

  app.whenReady().then(async () => {
    app.setName(appTitle);
    Menu.setApplicationMenu(null);
    workbenchWindowRegistry = createWorkbenchWindowRegistry({
      fs,
      registryPath: path.join(app.getPath('userData'), WORKBENCH_WINDOW_REGISTRY_FILE_NAME),
    });
    try {
      await ensureDefaultExportRoot();
    } catch (error) {
      console.warn('[Exporter] Default export directory is unavailable during startup; export commands will retry.', error);
    }
    await restoreRegisteredWorkbenchWindows();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void restoreRegisteredWorkbenchWindows();
  }
});
