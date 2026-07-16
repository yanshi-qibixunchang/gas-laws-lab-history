import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createElectronBuilderSafeSpawn,
  getElectronBuilderCliArgs,
  inspectElectronBuilderNpmCollectorSpawn,
  isElectronBuilderNpmCollectorSpawn,
} = require('../../scripts/runElectronBuilder.cjs') as {
  createElectronBuilderSafeSpawn: (
    spawn: (...args: unknown[]) => unknown,
    detectionOptions?: { platform?: string; readFileSync?: typeof readFileSync },
  ) => (...args: unknown[]) => unknown;
  getElectronBuilderCliArgs: (target: string) => string[];
  inspectElectronBuilderNpmCollectorSpawn: (
    command: unknown,
    args: unknown,
    options: unknown,
    detectionOptions?: { platform?: string; readFileSync?: typeof readFileSync },
  ) => null | { kind: 'safe'; batchPath: string } | { kind: 'unsafe'; reason: string };
  isElectronBuilderNpmCollectorSpawn: (
    command: unknown,
    args: unknown,
    options: unknown,
    detectionOptions?: { platform?: string; readFileSync?: typeof readFileSync },
  ) => boolean;
};

assert.deepEqual(
  getElectronBuilderCliArgs('nsis'),
  ['--win', 'nsis', '--x64', '--publish', 'never'],
  'installer builds must explicitly disable publishing',
);
assert.deepEqual(
  getElectronBuilderCliArgs('portable'),
  ['--win', 'portable', '--x64', '--publish', 'never'],
  'portable builds must explicitly disable publishing',
);
assert.throws(
  () => getElectronBuilderCliArgs('dir'),
  /Unsupported electron-builder target/,
  'the release entrypoint must reject unapproved targets',
);

const root = mkdtempSync(join(tmpdir(), 'hsl-electron-builder-spawn-'));
try {
  const collectorBatchPath = join(root, 'npm collector.bat');
  writeFileSync(
    collectorBatchPath,
    '@echo off\r\n"C:\\Program Files\\nodejs\\npm.cmd" %*\r\n',
    'utf8',
  );
  const npmListArgs = [
    'list', '-a', '--include', 'prod', '--include', 'optional', '--omit', 'dev', '--json', '--long', '--silent', '--loglevel=error',
  ];
  const collectorArgs = ['/c', `"${collectorBatchPath}"`, ...npmListArgs];
  const shellOptions = { cwd: root, shell: true, env: { COREPACK_ENABLE_STRICT: '0' } };
  const detectionOptions = { platform: 'win32', readFileSync };

  assert.equal(
    isElectronBuilderNpmCollectorSpawn('cmd.exe', collectorArgs, shellOptions, detectionOptions),
    true,
    'the exact electron-builder npm forwarding template should be recognized',
  );

  const calls: unknown[][] = [];
  const sentinel = {};
  const safeSpawn = createElectronBuilderSafeSpawn((...args: unknown[]) => {
    calls.push(args);
    return sentinel;
  }, detectionOptions);
  assert.equal(safeSpawn('cmd.exe', collectorArgs, shellOptions), sentinel);
  assert.deepEqual(
    calls[0],
    [
      'cmd.exe',
      ['/c', collectorBatchPath, ...npmListArgs],
      { cwd: root, shell: false, env: { COREPACK_ENABLE_STRICT: '0' } },
    ],
    'the redundant outer shell and its shell-only path quoting should be removed for the exact collector call',
  );

  const unrelatedBatchPath = join(root, 'unrelated.bat');
  writeFileSync(unrelatedBatchPath, '@echo off\r\n"C:\\Windows\\System32\\whoami.exe" %*\r\n', 'utf8');
  const unrelatedArgs = ['/c', `"${unrelatedBatchPath}"`, 'list'];
  assert.equal(
    isElectronBuilderNpmCollectorSpawn('cmd.exe', unrelatedArgs, shellOptions, detectionOptions),
    false,
    'unrelated batch forwarding must not be rewritten',
  );
  safeSpawn('cmd.exe', unrelatedArgs, shellOptions);
  assert.strictEqual(
    calls[1]?.[2],
    shellOptions,
    'unmatched spawn options must be passed through unchanged',
  );

  safeSpawn('cmd.exe', collectorArgs, { cwd: root, shell: false });
  assert.deepEqual(
    calls[2]?.[2],
    { cwd: root, shell: false },
    'already-safe calls must remain unchanged',
  );

  const configArgs = ['/c', `"${collectorBatchPath}"`, 'config', 'list'];
  assert.equal(
    inspectElectronBuilderNpmCollectorSpawn('cmd.exe', configArgs, shellOptions, detectionOptions)?.kind,
    'safe',
    'the exact npm config collector call should also be accepted',
  );

  const unsafeDirectory = join(root, 'unsafe&collector');
  mkdirSync(unsafeDirectory);
  const unsafeBatchPath = join(unsafeDirectory, 'npm collector.bat');
  writeFileSync(
    unsafeBatchPath,
    '@echo off\r\n"C:\\Program Files\\nodejs\\npm.cmd" %*\r\n',
    'utf8',
  );
  const unsafePathArgs = ['/c', `"${unsafeBatchPath}"`, ...npmListArgs];
  assert.equal(
    inspectElectronBuilderNpmCollectorSpawn('cmd.exe', unsafePathArgs, shellOptions, detectionOptions)?.kind,
    'unsafe',
    'CMD metacharacters in the temporary batch path must be rejected',
  );
  assert.throws(
    () => safeSpawn('cmd.exe', unsafePathArgs, shellOptions),
    /CMD-unsafe collector path/,
    'unsafe collector paths must fail closed instead of reaching cmd.exe',
  );

  const unsafeArgumentArgs = ['/c', `"${collectorBatchPath}"`, 'list&ver'];
  assert.throws(
    () => safeSpawn('cmd.exe', unsafeArgumentArgs, shellOptions),
    /unexpected npm collector arguments/,
    'unknown or metacharacter-bearing collector arguments must fail closed',
  );
  assert.throws(
    () => safeSpawn('cmd.exe', collectorArgs, { ...shellOptions, env: {} }),
    /unexpected npm collector environment/,
    'collector environment drift must fail closed',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('workbenchElectronBuilderSpawnSafety tests passed');
