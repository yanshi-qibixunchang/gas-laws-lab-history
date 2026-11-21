const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  assertHostedWindowsUpgradeProbe,
  isUpgradeWorkspaceIdentityPreserved,
  hasUpgradeWorkspaceSchema,
  observePackagedProcessExit,
} = require('./packagedDesktopProbePolicy.cjs');

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
const shouldVerifyFirstRunRestart = options['verify-first-run-restart'] === 'true';
const port = Number(options.port);
const comparePath = options.compare ? path.resolve(options.compare) : null;
const expectedUpdateVersion = options['expected-update-version'] ?? null;
const expectedFreeSessionVersion = options['expected-free-session-version'] === undefined
  ? null
  : Number(options['expected-free-session-version']);

assertHostedWindowsUpgradeProbe({
  platform: process.platform,
  environment: process.env,
  executablePath,
  evidenceDirectory,
  comparePath,
});

if (!fs.existsSync(executablePath)) throw new Error(`Packaged executable is missing: ${executablePath}`);
if (!['seed', 'confirm', 'verify'].includes(phase)) {
  throw new Error('Phase must be seed, confirm, or verify.');
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port is invalid.');
if (phase !== 'seed' && (!comparePath || !fs.existsSync(comparePath))) {
  throw new Error(`${phase} phase requires an existing --compare report.`);
}
if (expectedUpdateVersion !== null && (
  phase !== 'confirm' || !/^\d+\.\d+\.\d+$/.test(expectedUpdateVersion)
)) {
  throw new Error('Expected update version must be a stable version used with the confirm phase.');
}
if (expectedFreeSessionVersion !== null && (
  phase !== 'verify' || !Number.isSafeInteger(expectedFreeSessionVersion) || expectedFreeSessionVersion < 1
)) {
  throw new Error('Expected Free session version must be a positive integer used with the verify phase.');
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

const verifyFirstRunRestart = async (client, originalPageId) => {
  const click = (target, label, prefix = false, index = 0, selector = 'button') =>
    waitForEvaluation(target, `(() => {
      const matches = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((button) => {
        const text = (button.getAttribute('aria-label') || button.innerText || '').trim();
        const label = ${JSON.stringify(label)};
        return button.getClientRects().length > 0 &&
          (${prefix} ? text.startsWith(label) : text === label);
      });
      const button = matches[${index}];
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`, 25_000);
  // A hosted background window can finish storage bootstrap before Chromium
  // paints the startup animation. The desktop UI is also exercised in a foreground window.
  const storageReady = "(!document.querySelector('.app-startup-experience') || Boolean(document.querySelector('[data-app-startup-stage=complete]')))";
  const workbenchReady = `Boolean(document.querySelector('.studio-workbench[data-experiment-tutorial-active]')) && ${storageReady}`;
  const profile = "JSON.parse(localStorage.getItem('hsl_experience_profile_v1'))";
  const create = async (target, name) => {
    await click(target, '实验文件');
    await click(target, '新建实验');
    await click(target, name);
  };
  const describeWindow = (target) => evaluate(target, `({
    mode: document.querySelector('[data-first-run-mode]')?.getAttribute('data-first-run-mode'),
    startup: document.querySelector('.app-startup-experience')?.getAttribute('data-app-startup-stage'),
    busy: document.querySelector('.studio-workbench[data-experiment-tutorial-active]')?.getAttribute('aria-busy'),
    prompts: [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].map(el => el.innerText).join(' | ').slice(0, 1500),
    accepted: JSON.parse(localStorage.getItem('hsl_experience_profile_v1'))?.firstRunCompleted ?? false,
  })`);
  const restart = async (peer) => {
    await click(client, '设置');
    await click(client, '通用', true);
    await click(client, '重新开始首次引导', true);
    await click(client, '保存并重新开始');
    try {
      await waitForEvaluation(client, `Boolean(document.querySelector('[data-first-run-mode=full]')) && ${storageReady}`);
    } catch (error) {
      console.error('First-run restart state:', JSON.stringify(await describeWindow(client)));
      if (peer) console.error('Peer workspace state:', JSON.stringify(await describeWindow(peer)));
      throw error;
    }
    if (await evaluate(client, profile) !== null) throw new Error('The old experience profile survived.');
  };
  const completeSetup = async (pistonNeedsGuidance) => {
    await click(client, '下一步');
    await click(client, '下一步', false, 0, '[data-first-run-page=product] button');
    await click(client, '是，我已了解', true, 0, '[role=radio]');
    await click(client, pistonNeedsGuidance ? '否，我需要引导' : '是，我已了解', true, 1, '[role=radio]');
    await click(client, '下一步');
    await waitForEvaluation(client, `(() => {
      const body = document.querySelector('.studio-build-notice-body');
      if (!body) return false;
      body.scrollTop = body.scrollHeight;
      return true;
    })()`, 15_000);
    await click(client, '我已阅读并知悉');
    await waitForEvaluation(client, workbenchReady, 30_000);
    await waitForEvaluation(client, `${profile}?.learning?.pistonOscillation === ${JSON.stringify(pistonNeedsGuidance ? 'demo' : 'unlocked')}`);
  };

  const opened = await evaluate(client, 'window.hardSphereLabWindow.newWindow()');
  if (opened.status !== 'ok') throw new Error('Could not open the peer workspace.');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const peerTarget = targets.find((target) => target.type === 'page' && target.id !== originalPageId);
  if (!peerTarget) throw new Error('Could not locate the peer workspace.');
  const peer = new CdpClient(peerTarget.webSocketDebuggerUrl);
  await peer.connect();
  try {
    await waitForEvaluation(peer, workbenchReady, 30_000);
    await create(peer, '标准模拟研究');
    await waitForEvaluation(peer, "document.body.innerText.includes('Standard Simulation - 001')", 20_000);
    await evaluate(peer, 'window.hardSphereLabWindow.minimize()');
    await client.send('Page.bringToFront');
    await restart(peer);
    await waitForEvaluation(peer, "document.querySelector('.studio-workbench[aria-busy=true]') && !document.querySelector('[data-first-run-mode]')", 20_000);
    await completeSetup(true);
    await waitForEvaluation(peer, "document.querySelector('.studio-workbench[aria-busy=false]') && document.body.innerText.includes('Standard Simulation - 001')", 20_000);
    await evaluate(peer, 'window.hardSphereLabWindow.close()').catch((error) => {
      if (!String(error).includes('CDP closed')) throw error;
    });
  } finally {
    peer.close();
  }

  await create(client, '空气热容比（活塞振动法）');
  await waitForEvaluation(client, "document.querySelector('[data-experiment-tutorial-active=true]')", 30_000);
  await click(client, '我知道了');
  await waitForEvaluation(client, "[...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === '暂停演示' || button.innerText === '暂停演示')", 20_000);
  await restart();
  await completeSetup(false);
  await waitForEvaluation(client, `document.body.innerText.includes(${JSON.stringify(workspaceFileName)})`, 20_000);
  await waitForEvaluation(client, `(async () => !(await window.hardSphereLabTutorial.getState()).active)()`, 20_000);
  return true;
};

const indexedDbSnapshotExpression = `
  (async () => {
    const requestValue = (request) => new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const summarizeGeneration = (value) => {
      const content = value && typeof value === 'object' ? value.content : null;
      const workspace = content && typeof content === 'object'
        ? content.workspace
        : null;
      const manifest = workspace && typeof workspace === 'object'
        ? workspace.manifest
        : null;
      const records = Array.isArray(workspace?.records)
        ? workspace.records
        : [];
      return {
        key: value?.key ?? null,
        namespace: value?.namespace ?? null,
        generationId: value?.generationId ?? null,
        contentFingerprint: value?.contentFingerprint ?? null,
        capturedAtMs: value?.capturedAtMs ?? null,
        contentSchemaFamily: content?.schemaFamily ?? null,
        contentSchemaVersion: content?.schemaVersion ?? null,
        openFileIds: Array.isArray(content?.openFileIds)
          ? content.openFileIds
          : [],
        closedFileIds: Array.isArray(content?.closedFileIds)
          ? content.closedFileIds
          : [],
        manifest: {
          activeFileId: manifest?.activeFileId ?? null,
          selectedPanel: manifest?.selectedPanel ?? null,
          fileOrder: Array.isArray(manifest?.fileOrder)
            ? manifest.fileOrder
            : [],
        },
        files: records.map((record) => ({
          fileId: record?.fileId ?? null,
          fileKind: record?.fileKind ?? null,
          aggregateKind: record?.aggregateKind ?? null,
          name: record?.projection?.fields?.authoritative?.metadata?.name
            ?? null,
          pistonOscillationSchemaVersion:
            record?.projection?.fields?.authoritative
              ?.pistonOscillationSchemaVersion ?? null,
          pistonGuideSessionProjectionVersion:
            record?.projection?.fields?.authoritative
              ?.pistonGuideSessionProjectionVersion ?? null,
          pistonFreeSessionSchemaVersion:
            record?.projection?.fields?.authoritative
              ?.freeSession?.schemaVersion ?? null,
          hasDemoSession: Object.prototype.hasOwnProperty.call(
            record?.projection?.fields?.authoritative ?? {},
            'demoSession',
          ),
          hasGuideSession: Object.prototype.hasOwnProperty.call(
            record?.projection?.fields?.authoritative ?? {},
            'guideSession',
          ),
        })),
        opaqueFiles: Array.isArray(content?.opaqueFiles)
          ? content.opaqueFiles.map((entry) => ({
              fileId: entry?.fileId ?? null,
              location: entry?.location ?? null,
            }))
          : [],
        legacyRawRecordCount: Array.isArray(content?.legacyRawRecords)
          ? content.legacyRawRecords.length
          : 0,
      };
    };
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
        const includeValues = storeName === 'persistenceV3GenerationHeads'
          || storeName === 'persistenceV3Generations';
        const [count, keys, values] = await Promise.all([
          requestValue(store.count()),
          requestValue(store.getAllKeys()),
          includeValues ? requestValue(store.getAll()) : Promise.resolve(null),
        ]);
        stores.push({
          storeName,
          count,
          keys,
          ...(storeName === 'persistenceV3GenerationHeads'
            ? { heads: values }
            : {}),
          ...(storeName === 'persistenceV3Generations'
            ? { generations: values.map(summarizeGeneration) }
            : {}),
        });
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

const getActiveGeneration = (snapshot, databaseName) => {
  const headStore = getStoreSnapshot(
    snapshot,
    databaseName,
    'persistenceV3GenerationHeads',
  );
  const generationStore = getStoreSnapshot(
    snapshot,
    databaseName,
    'persistenceV3Generations',
  );
  const head = headStore?.heads?.find((candidate) => (
    candidate?.namespace === 'persistent:main'
  ));
  return generationStore?.generations?.find((candidate) => (
    candidate.generationId === head?.currentGenerationId
  )) ?? null;
};

const generationContainsWorkspaceFile = (generation, fileName) => (
  generation?.files?.some((file) => file.name === fileName) === true
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
  const processExit = observePackagedProcessExit(child);

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
      if (!created) throw new Error('Unable to create the installed piston-oscillation workspace file.');
      await waitForEvaluation(
        client,
        `document.body.innerText.includes(${JSON.stringify(workspaceFileName)})`,
      );
    }
    await sleep(5_000);

    // Exercise the shipped old client's public update channel in the disposable
    // Windows runner. Download and checksum validation must succeed before the
    // separate installer step; do not launch an updater against a daily profile.
    let updateProbe = null;
    if (expectedUpdateVersion !== null) {
      await evaluate(client, `(() => {
        window.__hslReleaseUpdateProbe = { done: false, check: null, download: null, error: null };
        (async () => {
          const probe = window.__hslReleaseUpdateProbe;
          try {
            probe.check = await window.hardSphereLabUpdater.checkForUpdates();
            if (probe.check.status === 'available' && probe.check.latestVersion === ${JSON.stringify(expectedUpdateVersion)}) {
              probe.download = await window.hardSphereLabUpdater.downloadUpdate();
            }
          } catch (error) {
            probe.error = String(error);
          } finally {
            probe.done = true;
          }
        })();
        return true;
      })()`);
      await waitForEvaluation(client, 'window.__hslReleaseUpdateProbe?.done === true', 600_000);
      updateProbe = await evaluate(client, 'window.__hslReleaseUpdateProbe');
    }

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
    const activeGeneration = getActiveGeneration(
      indexedDb,
      'hard-sphere-lab-workbench',
    );
    const checks = {
      workbenchLoaded: rendererState.hasWorkbench,
      startupHealthy: !rendererState.hasStartupFailure && !rendererState.hasPersistenceSafeMode,
      markerPresent: rendererState.marker === markerValue,
      workspaceFileRestored: rendererState.workspaceFileRestored,
      activeGenerationContainsWorkspaceFile:
        generationContainsWorkspaceFile(activeGeneration, workspaceFileName),
      rendererHasNoCriticalErrors: criticalErrors.length === 0,
      ...(expectedUpdateVersion === null ? {} : {
        publishedUpdateDetected: updateProbe?.check?.status === 'available'
          && updateProbe.check.latestVersion === expectedUpdateVersion,
        publishedUpdateDownloaded: updateProbe?.download?.status === 'downloaded'
          && updateProbe.download.latestVersion === expectedUpdateVersion
          && updateProbe.error === null,
      }),
      ...(previous ? {
        workspaceFileIdentityPreserved: isUpgradeWorkspaceIdentityPreserved(
          activeGeneration,
          previous.activeGeneration,
          workspaceFileName,
        ),
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
      ...(expectedFreeSessionVersion === null ? {} : {
        migratedWorkspaceSchemaPersisted: hasUpgradeWorkspaceSchema(
          activeGeneration,
          previous?.activeGeneration?.files?.find((file) => file.name === workspaceFileName)?.fileId,
          expectedFreeSessionVersion,
        ),
      }),
    };

    if (shouldVerifyFirstRunRestart) {
      checks.firstRunRestart = await verifyFirstRunRestart(client, target.id);
    }
    const reportPath = path.join(evidenceDirectory, `${phase}-packaged-app.json`);
    const report = {
      generatedAt: new Date().toISOString(),
      phase,
      executablePath,
      workspaceFileName,
      expectedFreeSessionVersion,
      expectedUpdateVersion,
      updateProbe,
      checks,
      passed: Object.values(checks).every(Boolean),
      rendererState,
      indexedDb,
      activeGeneration,
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
    let exitTimeout;
    const exit = await Promise.race([
      processExit,
      new Promise((resolve) => { exitTimeout = setTimeout(() => resolve(null), 20_000); }),
    ]).finally(() => clearTimeout(exitTimeout));
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
