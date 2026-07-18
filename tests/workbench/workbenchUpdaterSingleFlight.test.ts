import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type SingleFlightTask = {
  run: <T>(taskFactory: () => Promise<T> | T) => Promise<T>;
  readonly active: boolean;
};

const require = createRequire(import.meta.url);
const { createSingleFlightTask } = require('../../electron/updaterSingleFlight.cjs') as {
  createSingleFlightTask: () => SingleFlightTask;
};
const {
  canStartUpdaterStage,
  canTransitionUpdaterStatus,
  createUpdaterOperationCoordinator,
} = require('../../electron/updaterStateMachine.cjs') as {
  canStartUpdaterStage: (
    stage: string,
    state: { status: string; latestVersion?: string | null; errorStage?: string | null },
  ) => boolean;
  canTransitionUpdaterStatus: (currentStatus: string, nextStatus: string) => boolean;
  createUpdaterOperationCoordinator: () => {
    run: <T>(stage: string, taskFactory: () => Promise<T> | T) => Promise<T>;
    readonly activeStage: string | null;
  };
};

let resolveDownload: ((value: string) => void) | null = null;
let downloadCalls = 0;
const coordinator = createSingleFlightTask();
const first = coordinator.run(() => {
  downloadCalls += 1;
  return new Promise<string>((resolve) => {
    resolveDownload = resolve;
  });
});
const second = coordinator.run(() => {
  downloadCalls += 1;
  return Promise.resolve('unexpected second download');
});
assert.equal(first, second, 'repeated updater clicks must receive the same in-flight task');
assert.equal(coordinator.active, true);
await Promise.resolve();
assert.equal(downloadCalls, 1, 'only one underlying downloadUpdate task may start');
resolveDownload?.('downloaded');
assert.equal(await first, 'downloaded');
await Promise.resolve();
assert.equal(coordinator.active, false);

const third = coordinator.run(async () => {
  downloadCalls += 1;
  return 'next release';
});
assert.notEqual(third, first, 'a completed task must not block a future download');
assert.equal(await third, 'next release');
assert.equal(downloadCalls, 2);

const failureCoordinator = createSingleFlightTask();
await assert.rejects(
  failureCoordinator.run(async () => {
    throw new Error('injected updater failure');
  }),
  /injected updater failure/,
);
assert.equal(failureCoordinator.active, false, 'a rejected task must release the single-flight lock');

let resolveCheck: ((value: string) => void) | null = null;
let checkCalls = 0;
const updaterCoordinator = createUpdaterOperationCoordinator();
const activeCheck = updaterCoordinator.run('check', () => {
  checkCalls += 1;
  return new Promise<string>((resolve) => {
    resolveCheck = resolve;
  });
});
const repeatedCheck = updaterCoordinator.run('check', async () => {
  checkCalls += 1;
  return 'unexpected duplicate check';
});
assert.equal(activeCheck, repeatedCheck);
await assert.rejects(
  updaterCoordinator.run('download', async () => 'illegal overlapping download'),
  /cannot start while check is active/,
);
assert.equal(updaterCoordinator.activeStage, 'check');
await Promise.resolve();
assert.equal(checkCalls, 1);
resolveCheck?.('checked');
assert.equal(await activeCheck, 'checked');
await Promise.resolve();
assert.equal(updaterCoordinator.activeStage, null);

assert.equal(canStartUpdaterStage('check', { status: 'idle' }), true);
assert.equal(canStartUpdaterStage('download', { status: 'available', latestVersion: '5.1.2' }), true);
assert.equal(canStartUpdaterStage('download', { status: 'error', latestVersion: null }), false);
assert.equal(
  canStartUpdaterStage('download', {
    status: 'error',
    latestVersion: '5.1.2',
    errorStage: 'check',
  }),
  false,
  'stale metadata from a failed recheck must not authorize downloading the current version',
);
assert.equal(
  canStartUpdaterStage('download', {
    status: 'error',
    latestVersion: '5.1.3',
    errorStage: 'download',
  }),
  true,
  'a confirmed update whose download failed may be retried',
);
assert.equal(canStartUpdaterStage('install', { status: 'downloaded' }), true);
assert.equal(canStartUpdaterStage('install', { status: 'downloading' }), false);
assert.equal(canTransitionUpdaterStatus('checking', 'available'), true);
assert.equal(canTransitionUpdaterStatus('downloading', 'downloaded'), true);
assert.equal(
  canTransitionUpdaterStatus('downloaded', 'checking'),
  false,
  'a stale check event must not replace an installable update',
);
assert.equal(
  canTransitionUpdaterStatus('installing', 'downloaded'),
  true,
  'a restart watchdog may return to the downloaded state',
);

console.log('workbenchUpdaterSingleFlight tests passed');
