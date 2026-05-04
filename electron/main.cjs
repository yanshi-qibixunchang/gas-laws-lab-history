const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const preloadPath = path.join(__dirname, 'preload.cjs');
const exportRootFolderName = 'Hard Sphere Lab Exports';
let selectedExporterRuntime = null;

const getSystemExporterCandidates = () => ([
  path.join(process.resourcesPath || '', 'exporter', 'hsl_exporter.py'),
  path.join(rootDir, 'tools', 'exporter', 'hsl_exporter.py'),
]);

const getBundledExporterCandidates = () => ([
  path.join(rootDir, 'resources', 'exporter', 'hsl-exporter.exe'),
  path.join(process.resourcesPath || '', 'exporter', 'hsl-exporter.exe'),
]);

const getDefaultExportRoot = () => path.join(app.getPath('documents'), exportRootFolderName);

const runCommand = (command, args) => new Promise((resolve) => {
  const child = spawn(command, args, {
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
  String(value || 'Hard Sphere Lab Export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 96) || 'Hard Sphere Lab Export'
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
    || 'Hard Sphere Lab Experiment';
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
    title: 'Choose Hard Sphere Lab Export Root Folder',
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
    const target = path.join(dataDir, sanitizeName(payload.filename || 'hard-sphere-lab.csv'));
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

  const tempDir = path.join(os.tmpdir(), 'hard-sphere-lab-export');
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
