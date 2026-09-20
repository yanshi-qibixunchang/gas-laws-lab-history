const path = require('node:path');

// Published legacy builds can ignore --user-data-dir. Only a disposable hosted
// runner may exercise their default profile and perform an in-place upgrade.
const assertHostedWindowsUpgradeProbe = ({
  platform,
  environment,
  executablePath,
  evidenceDirectory,
  comparePath,
}) => {
  if (
    platform !== 'win32'
    || environment.GITHUB_ACTIONS !== 'true'
    || environment.RUNNER_ENVIRONMENT !== 'github-hosted'
    || environment.RUNNER_OS !== 'Windows'
  ) {
    throw new Error(
      'The legacy desktop upgrade probe requires a clean GitHub-hosted Windows runner. '
      + 'Legacy apps may ignore --user-data-dir; do not run this probe on a daily-use computer.',
    );
  }
  const runnerTemp = environment.RUNNER_TEMP;
  if (typeof runnerTemp !== 'string' || !path.isAbsolute(runnerTemp)) {
    throw new Error('The upgrade probe requires an absolute RUNNER_TEMP directory.');
  }
  for (const [label, target] of [
    ['executable', executablePath],
    ['evidence directory', evidenceDirectory],
    ...(comparePath === null ? [] : [['comparison report', comparePath]]),
  ]) {
    if (typeof target !== 'string' || !path.isAbsolute(target)) {
      throw new Error(`The upgrade probe ${label} must use an absolute path.`);
    }
    const relative = path.relative(runnerTemp, target);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`The upgrade probe ${label} must stay inside RUNNER_TEMP.`);
    }
  }
};

const isUpgradeWorkspaceIdentityPreserved = (current, previous, fileName) => {
  const original = previous?.files?.find((file) => file.name === fileName);
  return typeof original?.fileId === 'string'
    && current?.openFileIds?.includes(original.fileId) === true
    && current?.files?.some((file) => (
      file.fileId === original.fileId && file.name === original.name
    )) === true;
};

const hasUpgradeWorkspaceSchema = (generation, fileId, expectedVersion) => (
  typeof fileId === 'string'
  && generation?.files?.some((file) => (
    file.fileId === fileId && file.pistonFreeSessionSchemaVersion === expectedVersion
  )) === true
);

const observePackagedProcessExit = (child) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
};

module.exports = {
  assertHostedWindowsUpgradeProbe,
  isUpgradeWorkspaceIdentityPreserved,
  hasUpgradeWorkspaceSchema,
  observePackagedProcessExit,
};
