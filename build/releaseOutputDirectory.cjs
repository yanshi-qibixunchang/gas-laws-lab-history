const fs = require('node:fs');
const path = require('node:path');

// Opt-in local acceptance builds share one output directory across all three
// release steps. The ordinary release/ workflow remains the default.
const resolveReleaseOutputDirectory = (rootDir, override = process.env.HSL_RELEASE_OUTPUT_DIR) => {
  if (override === undefined) return path.join(rootDir, 'release');
  if (typeof override !== 'string' || !override.trim()) throw new Error('HSL_RELEASE_OUTPUT_DIR must name a new local acceptance directory.');
  const base = path.resolve(rootDir, 'output', 'local-acceptance');
  const directory = path.resolve(rootDir, override);
  const relative = path.relative(base, directory);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Local acceptance output must be below output/local-acceptance/.');
  }
  // A junction must not redirect the apparently isolated output to user files.
  let current = directory;
  while (path.relative(rootDir, current) !== '') {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('Local acceptance output must not traverse a symbolic link or junction.');
    }
    current = path.dirname(current);
  }
  return directory;
};

const reserveLocalAcceptanceDirectory = (rootDir, override) => {
  const directory = resolveReleaseOutputDirectory(rootDir, override);
  if (override === undefined) return directory;
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  // Non-recursive creation rejects an existing candidate, even an empty one.
  fs.mkdirSync(directory);
  return directory;
};

module.exports = { resolveReleaseOutputDirectory, reserveLocalAcceptanceDirectory };
