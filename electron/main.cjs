const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const exporterPath = path.join(rootDir, 'tools', 'exporter', 'hsl_exporter.py');
const preloadPath = path.join(__dirname, 'preload.cjs');

const runPython = (args) => new Promise((resolve) => {
  const child = spawn('python', args, {
    cwd: rootDir,
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

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const sanitizeName = (value) => (
  String(value || 'Hard Sphere Lab Export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 96) || 'Hard Sphere Lab Export'
);

const getDefaultExportDirName = (payload, options) => {
  if (options?.defaultDirName) {
    return sanitizeName(options.defaultDirName);
  }

  const source =
    options?.fileName
    || payload?.data?.fileName
    || payload?.filename
    || 'Hard Sphere Lab Export';
  return sanitizeName(`${source} Export`);
};

const createMainWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  await mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'));
};

ipcMain.handle('hsl-exporter:check', async () => {
  try {
    await fs.access(exporterPath);
  } catch {
    return {
      status: 'error',
      message: `Exporter script was not found: ${exporterPath}`,
    };
  }

  const result = await runPython([exporterPath, '--self-check']);
  const details = parseJson(result.stdout);

  if (result.code === 0) {
    return {
      status: 'available-system',
      message: details
        ? `Python ${details.python}, matplotlib ${details.matplotlib}, reportlab ${details.reportlab}`
        : 'System Python exporter is available.',
      stdout: result.stdout,
      stderr: result.stderr,
      details,
    };
  }

  const missingPython = result.code === -1;
  return {
    status: missingPython ? 'unavailable' : 'error',
    message: missingPython
      ? 'System Python is unavailable. Install Python and the exporter dependencies before using desktop export.'
      : (result.stderr.trim() || 'Python exporter self-check failed.'),
    stdout: result.stdout,
    stderr: result.stderr,
  };
});

ipcMain.handle('hsl-exporter:export', async (_event, payload, options = {}) => {
  if (!payload || typeof payload !== 'object' || !('kind' in payload)) {
    return {
      status: 'error',
      message: 'Invalid export payload.',
    };
  }

  if (payload.kind === 'csv') {
    const defaultPath = path.join(app.getPath('documents'), sanitizeName(payload.filename || 'hard-sphere-lab.csv'));
    const selection = await dialog.showSaveDialog({
      title: 'Save Hard Sphere Lab CSV',
      defaultPath,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });

    if (selection.canceled || !selection.filePath) {
      return { status: 'cancelled' };
    }

    await fs.writeFile(selection.filePath, payload.content || '', 'utf8');
    return {
      status: 'ok',
      outDir: path.dirname(selection.filePath),
      files: [selection.filePath],
      metadataPath: null,
      stdout: '',
      stderr: '',
    };
  }

  if (payload.kind !== 'json') {
    return {
      status: 'error',
      message: `Unsupported export payload kind: ${payload.kind}`,
    };
  }

  const defaultPath = path.join(app.getPath('documents'), getDefaultExportDirName(payload, options));
  const selection = await dialog.showOpenDialog({
    title: 'Choose Hard Sphere Lab Export Folder',
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (selection.canceled || selection.filePaths.length === 0) {
    return { status: 'cancelled' };
  }

  const outDir = selection.filePaths[0];
  const tempDir = path.join(os.tmpdir(), 'hard-sphere-lab-export');
  await fs.mkdir(tempDir, { recursive: true });
  const inputPath = path.join(tempDir, `${Date.now()}-${sanitizeName(payload.filename || 'payload.json')}`);
  await fs.writeFile(inputPath, JSON.stringify(payload, null, 2), 'utf8');

  const result = await runPython([exporterPath, '--input', inputPath, '--out', outDir]);
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
  };
});

app.whenReady().then(createMainWindow);

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
