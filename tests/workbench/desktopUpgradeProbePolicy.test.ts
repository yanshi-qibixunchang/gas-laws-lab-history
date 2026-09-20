import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = process.cwd();
const uncreatedEvidence = path.join(root, 'output', 'blocked-upgrade-probe');
const localProbe = spawnSync(process.execPath, [
  'scripts/verifyPackagedDesktopState.cjs',
  '--executable', path.join(uncreatedEvidence, 'must-never-launch.exe'),
  '--phase', 'seed',
  '--port', '9331',
  '--evidence-dir', uncreatedEvidence,
], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, GITHUB_ACTIONS: '', RUNNER_ENVIRONMENT: '' },
});
assert.notEqual(localProbe.status, 0);
assert.match(
  localProbe.stderr,
  /clean GitHub-hosted Windows runner/,
  'the probe must reject a local invocation before inspecting or starting an old app',
);
assert.equal(existsSync(uncreatedEvidence), false);

const require = createRequire(import.meta.url);
const {
  assertHostedWindowsUpgradeProbe,
  isUpgradeWorkspaceIdentityPreserved,
  hasUpgradeWorkspaceSchema,
  observePackagedProcessExit,
} = require(
  '../../scripts/packagedDesktopProbePolicy.cjs',
);
const runnerTemp = path.resolve(root, 'output', 'synthetic-runner-temp');
const allowed = {
  platform: 'win32',
  environment: {
    GITHUB_ACTIONS: 'true',
    RUNNER_ENVIRONMENT: 'github-hosted',
    RUNNER_OS: 'Windows',
    RUNNER_TEMP: runnerTemp,
  },
  executablePath: path.join(runnerTemp, 'installation', 'Gas Laws Lab.exe'),
  evidenceDirectory: path.join(runnerTemp, 'evidence'),
  comparePath: path.join(runnerTemp, 'evidence', 'seed-packaged-app.json'),
};
assert.doesNotThrow(() => assertHostedWindowsUpgradeProbe(allowed));
assert.doesNotThrow(() => assertHostedWindowsUpgradeProbe({ ...allowed, comparePath: null }));
for (const environment of [
  { ...allowed.environment, GITHUB_ACTIONS: '' },
  { ...allowed.environment, RUNNER_ENVIRONMENT: 'self-hosted' },
  { ...allowed.environment, RUNNER_OS: 'Linux' },
  { ...allowed.environment, RUNNER_TEMP: '' },
  { ...allowed.environment, RUNNER_TEMP: 'relative-temp' },
]) {
  assert.throws(() => assertHostedWindowsUpgradeProbe({ ...allowed, environment }));
}
assert.throws(() => assertHostedWindowsUpgradeProbe({ ...allowed, platform: 'linux' }));
for (const key of ['executablePath', 'evidenceDirectory', 'comparePath']) {
  for (const outside of [
    runnerTemp,
    path.join(runnerTemp, '..', 'daily-profile'),
    `${runnerTemp}-similar-prefix`,
    'relative-path',
  ]) {
    assert.throws(() => assertHostedWindowsUpgradeProbe({ ...allowed, [key]: outside }));
  }
}
assert.equal(existsSync(runnerTemp), false, 'policy validation must be read-only');
const oldGeneration = {
  openFileIds: ['old-file-id'],
  files: [{ fileId: 'old-file-id', name: 'Piston Oscillation - 001' }],
};
assert.equal(isUpgradeWorkspaceIdentityPreserved(oldGeneration, oldGeneration, 'Piston Oscillation - 001'), true);
assert.equal(isUpgradeWorkspaceIdentityPreserved({
  openFileIds: ['new-file-id'],
  files: [{ fileId: 'new-file-id', name: 'Piston Oscillation - 001' }],
}, oldGeneration, 'Piston Oscillation - 001'), false, 'matching display names must not mask replacement');
assert.equal(isUpgradeWorkspaceIdentityPreserved({
  ...oldGeneration, openFileIds: [],
}, oldGeneration, 'Piston Oscillation - 001'), false, 'a record retained in storage alone is not an open restored file');
assert.equal(isUpgradeWorkspaceIdentityPreserved(null, oldGeneration, 'Piston Oscillation - 001'), false);
assert.equal(isUpgradeWorkspaceIdentityPreserved(oldGeneration, null, 'Piston Oscillation - 001'), false);
for (const schemaVersion of [8, 9, 10, 11, null]) {
  const persisted = {
    ...oldGeneration,
    files: [{ ...oldGeneration.files[0], pistonFreeSessionSchemaVersion: schemaVersion }],
  };
  assert.equal(hasUpgradeWorkspaceSchema(persisted, 'old-file-id', 10), schemaVersion === 10);
}
assert.equal(hasUpgradeWorkspaceSchema(oldGeneration, 'old-file-id', 10), false);
assert.equal(hasUpgradeWorkspaceSchema(null, 'old-file-id', 10), false);
assert.equal(hasUpgradeWorkspaceSchema({
  ...oldGeneration,
  files: [{ fileId: 'replacement-id', pistonFreeSessionSchemaVersion: 10 }],
}, 'old-file-id', 10), false);
const fastExit = Object.assign(new EventEmitter(), { exitCode: null as number | null, signalCode: null });
const observedExit = observePackagedProcessExit(fastExit);
fastExit.exitCode = 0;
fastExit.emit('exit', 0, null);
await Promise.resolve(); // The close/CDP request can finish after the process exit event.
assert.deepEqual(await observedExit, { code: 0, signal: null });
assert.deepEqual(await observePackagedProcessExit(fastExit), { code: 0, signal: null });
const signalExit = Object.assign(new EventEmitter(), { exitCode: null, signalCode: 'SIGTERM' });
assert.deepEqual(await observePackagedProcessExit(signalExit), { code: null, signal: 'SIGTERM' });
console.log('desktopUpgradeProbePolicy tests passed');
