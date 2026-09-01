const { spawn, spawnSync } = require('node:child_process');

const EXPORTER_SELF_CHECK_TIMEOUT_MS = 30_000;
const EXPORTER_JOB_TIMEOUT_MS = 180_000;
const MAX_EXPORTER_STDOUT_BYTES = 8 * 1024 * 1024;
const MAX_EXPORTER_STDERR_BYTES = 2 * 1024 * 1024;
const EXPORTER_TERMINATION_GRACE_MS = 5_000;

const normalizePositiveInteger = (value, fallback) => (
  Number.isInteger(value) && value > 0 ? value : fallback
);

const terminateChildProcessTree = (child) => {
  if (!child || !Number.isInteger(child.pid)) return;

  if (process.platform === 'win32') {
    try {
      const result = spawnSync(
        'taskkill',
        ['/pid', String(child.pid), '/t', '/f'],
        {
          windowsHide: true,
          shell: false,
          stdio: 'ignore',
        },
      );
      if (!result.error && result.status === 0) return;
    } catch {
      // Fall through to the direct child kill below.
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
      return;
    } catch {
      // Fall through when the process group has already exited or was not created.
    }
  }

  try {
    child.kill('SIGKILL');
  } catch {
    // The child may have exited between the boundary check and termination.
  }
};

const runBoundedCommand = (command, args = [], options = {}) => new Promise((resolve) => {
  const timeoutMs = normalizePositiveInteger(options.timeoutMs, EXPORTER_JOB_TIMEOUT_MS);
  const maxStdoutBytes = normalizePositiveInteger(
    options.maxStdoutBytes,
    MAX_EXPORTER_STDOUT_BYTES,
  );
  const maxStderrBytes = normalizePositiveInteger(
    options.maxStderrBytes,
    MAX_EXPORTER_STDERR_BYTES,
  );
  const terminationGraceMs = normalizePositiveInteger(
    options.terminationGraceMs,
    EXPORTER_TERMINATION_GRACE_MS,
  );
  const spawnImpl = options.spawnImpl || spawn;
  const terminateImpl = options.terminateImpl || terminateChildProcessTree;

  let child;
  try {
    child = spawnImpl(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    resolve({
      code: -1,
      signal: null,
      stdout: '',
      stderr: `Exporter process could not start: ${error.message}`,
      failureKind: 'spawn-error',
      error,
    });
    return;
  }

  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let failureKind = null;
  let processError = null;
  let settled = false;
  let terminationRequested = false;
  let terminationGraceTimer = null;

  const appendStderrDiagnostic = (message) => {
    const separator = stderr.length > 0 && !stderr.toString('utf8').endsWith('\n') ? '\n' : '';
    stderr = Buffer.concat([stderr, Buffer.from(`${separator}${message}\n`, 'utf8')]);
  };

  const finalize = (code, signal) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutTimer);
    if (terminationGraceTimer) clearTimeout(terminationGraceTimer);
    resolve({
      code: failureKind ? -1 : (code ?? 1),
      signal: signal ?? null,
      stdout: stdout.toString('utf8'),
      stderr: stderr.toString('utf8'),
      failureKind: failureKind || (code === 0 ? null : 'exit-code'),
      ...(processError ? { error: processError } : {}),
    });
  };

  const requestTermination = (kind, diagnostic) => {
    if (!failureKind) {
      failureKind = kind;
      appendStderrDiagnostic(diagnostic);
    }
    if (terminationRequested) return;
    terminationRequested = true;
    terminationGraceTimer = setTimeout(() => finalize(null, null), terminationGraceMs);
    try {
      terminateImpl(child);
    } catch (error) {
      processError = error;
      appendStderrDiagnostic(`Exporter process termination failed: ${error.message}`);
    }
  };

  const captureChunk = (streamName, chunk) => {
    if (failureKind) return;
    const incoming = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const isStdout = streamName === 'stdout';
    const current = isStdout ? stdout : stderr;
    const limit = isStdout ? maxStdoutBytes : maxStderrBytes;
    const remaining = Math.max(0, limit - current.length);
    const captured = incoming.subarray(0, remaining);
    if (isStdout) stdout = Buffer.concat([stdout, captured]);
    else stderr = Buffer.concat([stderr, captured]);

    if (incoming.length > remaining) {
      requestTermination(
        `${streamName}-limit`,
        `Exporter ${streamName} exceeded the ${limit}-byte limit and was stopped.`,
      );
    }
  };

  child.stdout?.on('data', (chunk) => captureChunk('stdout', chunk));
  child.stderr?.on('data', (chunk) => captureChunk('stderr', chunk));
  child.on('error', (error) => {
    if (settled) return;
    processError = error;
    failureKind = 'spawn-error';
    appendStderrDiagnostic(`Exporter process could not start: ${error.message}`);
    finalize(null, null);
  });
  child.on('close', (code, signal) => finalize(code, signal));

  const timeoutTimer = setTimeout(() => {
    requestTermination(
      'timeout',
      `Exporter process exceeded the ${timeoutMs}-millisecond time limit and was stopped.`,
    );
  }, timeoutMs);
});

module.exports = {
  EXPORTER_JOB_TIMEOUT_MS,
  EXPORTER_SELF_CHECK_TIMEOUT_MS,
  EXPORTER_TERMINATION_GRACE_MS,
  MAX_EXPORTER_STDERR_BYTES,
  MAX_EXPORTER_STDOUT_BYTES,
  runBoundedCommand,
  terminateChildProcessTree,
};
