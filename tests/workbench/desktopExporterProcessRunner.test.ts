import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  EXPORTER_JOB_TIMEOUT_MS,
  EXPORTER_SELF_CHECK_TIMEOUT_MS,
  MAX_EXPORTER_STDERR_BYTES,
  MAX_EXPORTER_STDOUT_BYTES,
  runBoundedCommand,
} = require('../../electron/exporterProcessRunner.cjs') as {
  EXPORTER_JOB_TIMEOUT_MS: number;
  EXPORTER_SELF_CHECK_TIMEOUT_MS: number;
  MAX_EXPORTER_STDERR_BYTES: number;
  MAX_EXPORTER_STDOUT_BYTES: number;
  runBoundedCommand: (
    command: string,
    args: string[],
    options?: {
      cwd?: string;
      timeoutMs?: number;
      maxStdoutBytes?: number;
      maxStderrBytes?: number;
      terminationGraceMs?: number;
    },
  ) => Promise<{
    code: number;
    signal: string | null;
    stdout: string;
    stderr: string;
    failureKind: string | null;
  }>;
};

const mainSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const runnerSource = readFileSync(
  new URL('../../electron/exporterProcessRunner.cjs', import.meta.url),
  'utf8',
);

assert.equal(EXPORTER_SELF_CHECK_TIMEOUT_MS, 30_000);
assert.equal(EXPORTER_JOB_TIMEOUT_MS, 180_000);
assert.equal(MAX_EXPORTER_STDOUT_BYTES, 8 * 1024 * 1024);
assert.equal(MAX_EXPORTER_STDERR_BYTES, 2 * 1024 * 1024);
assert.match(mainSource, /runBoundedCommand\(command, args, \{[\s\S]*timeoutMs:/);
assert.match(mainSource, /\['--self-check'\],[\s\S]*EXPORTER_SELF_CHECK_TIMEOUT_MS/);
assert.match(runnerSource, /\['\/pid', String\(child\.pid\), '\/t', '\/f'\]/);
assert.match(runnerSource, /process\.kill\(-child\.pid, 'SIGKILL'\)/);

const normal = await runBoundedCommand(
  process.execPath,
  ['-e', "process.stdout.write('ready'); process.stderr.write('note');"],
  { timeoutMs: 5_000 },
);
assert.equal(normal.code, 0);
assert.equal(normal.failureKind, null);
assert.equal(normal.stdout, 'ready');
assert.equal(normal.stderr, 'note');

const timedOut = await runBoundedCommand(
  process.execPath,
  ['-e', 'setInterval(() => {}, 1000);'],
  { timeoutMs: 100, terminationGraceMs: 2_000 },
);
assert.equal(timedOut.code, -1);
assert.equal(timedOut.failureKind, 'timeout');
assert.match(timedOut.stderr, /exceeded the 100-millisecond time limit and was stopped/);

const excessiveStdout = await runBoundedCommand(
  process.execPath,
  ['-e', "process.stdout.write('x'.repeat(8192)); setInterval(() => {}, 1000);"],
  { timeoutMs: 5_000, maxStdoutBytes: 1_024, terminationGraceMs: 2_000 },
);
assert.equal(excessiveStdout.code, -1);
assert.equal(excessiveStdout.failureKind, 'stdout-limit');
assert.equal(Buffer.byteLength(excessiveStdout.stdout), 1_024);
assert.match(excessiveStdout.stderr, /stdout exceeded the 1024-byte limit and was stopped/);

const excessiveStderr = await runBoundedCommand(
  process.execPath,
  ['-e', "process.stderr.write('x'.repeat(8192)); setInterval(() => {}, 1000);"],
  { timeoutMs: 5_000, maxStderrBytes: 1_024, terminationGraceMs: 2_000 },
);
assert.equal(excessiveStderr.code, -1);
assert.equal(excessiveStderr.failureKind, 'stderr-limit');
assert.match(excessiveStderr.stderr, /stderr exceeded the 1024-byte limit and was stopped/);
assert.ok(
  Buffer.byteLength(excessiveStderr.stderr) < 1_200,
  'diagnostics may exceed the capture cap only by one short bounded message',
);

const spawnFailure = await runBoundedCommand(
  'hsl-exporter-command-that-does-not-exist',
  [],
  { timeoutMs: 5_000 },
);
assert.equal(spawnFailure.code, -1);
assert.equal(spawnFailure.failureKind, 'spawn-error');
assert.match(spawnFailure.stderr, /could not start/);

console.log('desktopExporterProcessRunner tests passed');
