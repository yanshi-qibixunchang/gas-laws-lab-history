const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const parseArguments = (argumentsList) => {
  const parsed = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const key = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '<end>'}.`);
    }
    parsed[key.slice(2)] = value;
  }
  return parsed;
};

const options = parseArguments(process.argv.slice(2));
const executablePath = path.resolve(options.executable ?? '');
const evidenceDirectory = path.resolve(options['evidence-dir'] ?? '');
const phase = options.phase;
const port = Number(options.port);
const comparePath = options.compare ? path.resolve(options.compare) : null;

if (!fs.existsSync(executablePath)) throw new Error(`Packaged executable is missing: ${executablePath}`);
if (!['seed', 'verify'].includes(phase)) throw new Error('Phase must be seed or verify.');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port is invalid.');
if (phase === 'verify' && (!comparePath || !fs.existsSync(comparePath))) {
  throw new Error('Verify phase requires an existing --compare report.');
}

const markerKey = 'hsl_upgrade_smoke_from_5_3_1';
const markerValue = 'created-by-packaged-5.3.1-before-6.1.1-replacement';
const workspaceFileName = 'Piston Oscillation - 001';
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out opening the CDP WebSocket.')), 15_000);
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Unable to open the CDP WebSocket.'));
      }, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
    this.socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error(`CDP closed while waiting for ${pending.method}.`));
      }
      this.pending.clear();
    });
  }

  onEvent(listener) {
    this.listeners.add(listener);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for CDP method ${method}.`));
      }, 20_000);
      this.pending.set(id, {
        method,
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.close();
  }
}

const waitForPageTarget = async (child, timeoutMilliseconds = 90_000) => {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Packaged app exited before CDP became available (exit ${child.exitCode}).`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((candidate) => candidate.type === 'page');
        if (target?.webSocketDebuggerUrl) return target;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for packaged app CDP target: ${lastError ?? 'no target'}`);
};

const evaluate = async (client, expression) => {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description
      ?? response.exceptionDetails.text
      ?? 'Runtime.evaluate failed.',
    );
  }
  return response.result?.value;
};

const waitForEvaluation = async (client, expression, timeoutMilliseconds = 90_000) => {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(client, expression)) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for renderer state: ${lastError ?? expression}`);
};

const indexedDbSnapshotExpression = `
  (async () => {
    const databaseInfos = await indexedDB.databases();
    const snapshots = [];
    for (const info of databaseInfos) {
      if (!info.name) continue;
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open(info.name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const stores = [];
      for (const storeName of Array.from(database.objectStoreNames)) {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const [count, keys] = await Promise.all([
          new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }),
          new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }),
        ]);
        stores.push({ storeName, count, keys });
      }
      database.close();
      snapshots.push({ name: info.name, version: info.version, stores });
    }
    return snapshots;
  })()
`;

const normalizeDatabaseSnapshot = (snapshot) => snapshot.map((database) => ({
  name: database.name,
  version: database.version,
  stores: database.stores.map((store) => store.storeName).sort(),
}));

const getStoreSnapshot = (snapshot, databaseName, storeName) => (
  snapshot
    .find((database) => database.name === databaseName)
    ?.stores.find((store) => store.storeName === storeName)
  ?? null
);

const includesEveryKey = (currentKeys, previousKeys) => (
  previousKeys.every((key) => currentKeys.some((candidate) => (
    JSON.stringify(candidate) === JSON.stringify(key)
  )))
);

const run = async () => {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const stdout = [];
  const stderr = [];
  const events = {
    consoleErrors: [],
    exceptions: [],
    logErrors: [],
    failedRequests: [],
    httpErrors: [],
    warnings: [],
  };
  const child = spawn(executablePath, [
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
  ], {
    cwd: path.dirname(executablePath),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => stdout.push(chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString('utf8')));

  let client;
  try {
    const target = await waitForPageTarget(child);
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    client.onEvent((message) => {
      if (message.method === 'Runtime.exceptionThrown') {
        events.exceptions.push(message.params.exceptionDetails);
      } else if (message.method === 'Runtime.consoleAPICalled') {
        const entry = {
          type: message.params.type,
          text: message.params.args.map((argument) => argument.value ?? argument.description ?? '').join(' '),
        };
        if (message.params.type === 'error') events.consoleErrors.push(entry);
        else if (message.params.type === 'warning') events.warnings.push(entry);
      } else if (message.method === 'Log.entryAdded') {
        const entry = message.params.entry;
        if (entry.level === 'error') events.logErrors.push(entry);
        else if (entry.level === 'warning') events.warnings.push(entry);
      } else if (message.method === 'Network.loadingFailed') {
        if (!message.params.canceled) events.failedRequests.push(message.params);
      } else if (
        message.method === 'Network.responseReceived'
        && message.params.response.status >= 400
      ) {
        events.httpErrors.push({
          url: message.params.response.url,
          status: message.params.response.status,
          statusText: message.params.response.statusText,
        });
      }
    });
    await Promise.all([
      client.send('Runtime.enable'),
      client.send('Page.enable'),
      client.send('Log.enable'),
      client.send('Network.enable'),
    ]);
    await waitForEvaluation(
      client,
      "document.readyState === 'complete' && document.body && document.body.innerText.length > 20",
    );

    if (phase === 'seed') {
      const experienceProfile = {
        schemaVersion: 1,
        firstRunCompleted: true,
        acceptedLegalVersion: '2026-07-23.1',
        committedLanguage: 'zh-CN',
        needs: {
          workspaceUi: 'known',
          heatCapacity: 'known',
          pistonOscillation: 'known',
        },
        learning: {
          heatCapacity: 'unlocked',
          pistonOscillation: 'unlocked',
        },
        activeTutorialExperiment: null,
      };
      await evaluate(client, `(() => {
        localStorage.setItem(${JSON.stringify(markerKey)}, ${JSON.stringify(markerValue)});
        localStorage.setItem('hsl_experience_profile_v1', ${JSON.stringify(JSON.stringify(experienceProfile))});
        location.reload();
        return true;
      })()`);
    }

    await waitForEvaluation(
      client,
      "Boolean(document.querySelector('.studio-workbench:not(.app-startup-experience):not(.first-run-experience)')) && !document.querySelector('.app-startup-experience')",
    );

    if (phase === 'seed') {
      const created = await evaluate(client, `(() => {
        const button = document.querySelector(
          '[data-workbench-create-experiment="heatCapacityPistonOscillation"]',
        );
        if (!(button instanceof HTMLButtonElement)) return false;
        button.click();
        return true;
      })()`);
      if (!created) throw new Error('Unable to create the packaged 5.3.1 piston-oscillation workspace file.');
    }
    await waitForEvaluation(
      client,
      `document.body.innerText.includes(${JSON.stringify(workspaceFileName)})`,
    );
    await sleep(5_000);

    const rendererState = await evaluate(client, `(() => ({
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      bodyText: document.body.innerText.slice(0, 4000),
      hasWorkbench: Boolean(document.querySelector('.studio-workbench:not(.app-startup-experience):not(.first-run-experience)')),
      hasStartupFailure: Boolean(document.querySelector('.app-startup-failure')),
      hasPersistenceSafeMode: Boolean(document.querySelector('[data-workbench-persistence-safe-mode="true"]')),
      marker: localStorage.getItem(${JSON.stringify(markerKey)}),
      experienceProfile: localStorage.getItem('hsl_experience_profile_v1'),
      workspaceFileRestored: document.body.innerText.includes(${JSON.stringify(workspaceFileName)}),
      localStorageKeys: Object.keys(localStorage).sort(),
      dimensions: { innerWidth, innerHeight, devicePixelRatio },
    }))()`);
    const indexedDb = await evaluate(client, indexedDbSnapshotExpression);
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const screenshotPath = path.join(evidenceDirectory, `${phase}-packaged-app.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const criticalErrors = [
      ...events.consoleErrors,
      ...events.exceptions,
      ...events.logErrors,
      ...events.failedRequests,
      ...events.httpErrors,
    ];
    const previous = comparePath ? JSON.parse(fs.readFileSync(comparePath, 'utf8')) : null;
    const previousHeads = previous
      ? getStoreSnapshot(
          previous.indexedDb,
          'hard-sphere-lab-workbench',
          'persistenceV3GenerationHeads',
        )
      : null;
    const currentHeads = getStoreSnapshot(
      indexedDb,
      'hard-sphere-lab-workbench',
      'persistenceV3GenerationHeads',
    );
    const currentGenerations = getStoreSnapshot(
      indexedDb,
      'hard-sphere-lab-workbench',
      'persistenceV3Generations',
    );
    const checks = {
      workbenchLoaded: rendererState.hasWorkbench,
      startupHealthy: !rendererState.hasStartupFailure && !rendererState.hasPersistenceSafeMode,
      markerPresent: rendererState.marker === markerValue,
      workspaceFileRestored: rendererState.workspaceFileRestored,
      rendererHasNoCriticalErrors: criticalErrors.length === 0,
      ...(previous ? {
        experienceProfilePreserved:
          rendererState.experienceProfile === previous.rendererState.experienceProfile,
        indexedDbSchemaPreserved:
          JSON.stringify(normalizeDatabaseSnapshot(indexedDb))
          === JSON.stringify(normalizeDatabaseSnapshot(previous.indexedDb)),
        indexedDbPersistentNamespacePreserved:
          previousHeads !== null
          && currentHeads !== null
          && includesEveryKey(currentHeads.keys, previousHeads.keys),
        indexedDbHasReadableWorkspaceGeneration:
          currentGenerations !== null && currentGenerations.count >= 1,
      } : {}),
    };

    const reportPath = path.join(evidenceDirectory, `${phase}-packaged-app.json`);
    const report = {
      generatedAt: new Date().toISOString(),
      phase,
      executablePath,
      workspaceFileName,
      checks,
      passed: Object.values(checks).every(Boolean),
      rendererState,
      indexedDb,
      events,
      mainProcess: {
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      },
      screenshotPath,
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    try {
      await evaluate(client, `(async () => {
        if (window.hardSphereLabWindow?.close) return window.hardSphereLabWindow.close();
        window.close();
        return { status: 'window-close-fallback' };
      })()`);
    } catch (error) {
      if (!String(error).includes('CDP closed')) throw error;
    }
    const exit = await Promise.race([
      new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal }))),
      sleep(20_000).then(() => null),
    ]);
    if (!exit) {
      child.kill();
      throw new Error('Packaged app did not close through its desktop bridge.');
    }
    report.mainProcess.exit = exit;
    report.checks.closedCleanly = exit.code === 0;
    report.passed = Object.values(report.checks).every(Boolean);
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ reportPath, screenshotPath, checks: report.checks }, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    client?.close();
    if (child.exitCode === null) child.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
