import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { resolveReleaseOutputDirectory, reserveLocalAcceptanceDirectory } = require('../../build/releaseOutputDirectory.cjs') as {
  resolveReleaseOutputDirectory: (root: string, override?: string) => string;
  reserveLocalAcceptanceDirectory: (root: string, override?: string) => string;
};
const { getElectronBuilderCliArgs } = require('../../scripts/runElectronBuilder.cjs') as {
  getElectronBuilderCliArgs: (target: string, output?: string) => string[];
};
const root = mkdtempSync(join(tmpdir(), 'hsl-acceptance-output-'));
try {
  assert.equal(resolveReleaseOutputDirectory(root), join(root, 'release'));
  const directory = join(root, 'output', 'local-acceptance', 'candidate with spaces');
  assert.equal(reserveLocalAcceptanceDirectory(root, directory), directory);
  const sentinel = join(directory, 'latest.yml');
  writeFileSync(sentinel, 'previous candidate');
  assert.throws(() => reserveLocalAcceptanceDirectory(root, directory), /EEXIST/);
  assert.equal(readFileSync(sentinel, 'utf8'), 'previous candidate', 'a retry must not replace a previous candidate');
  for (const override of ['', root, 'release', 'output/local-acceptance', '../outside', 'output/local-acceptance/../../release']) {
    assert.throws(() => resolveReleaseOutputDirectory(root, override), /local acceptance|below output/);
  }
  const linkedPath = join(root, 'output', 'local-acceptance', 'redirected');
  symlinkSync(directory, linkedPath, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveReleaseOutputDirectory(root, join(linkedPath, 'another')), /symbolic link or junction/);
  assert.deepEqual(getElectronBuilderCliArgs('nsis', directory), ['--win', 'nsis', '--x64', '--publish', 'never', `--config.directories.output=${directory}`]);
  if (process.platform === 'win32') assert.equal(resolveReleaseOutputDirectory(root, directory.toUpperCase()), directory.toUpperCase());
} finally {
  rmSync(root, { recursive: true, force: true });
}

// Exercise the actual metadata CLI against an isolated candidate and confirm
// that the existing release/latest.yml is untouched.
const repository = fileURLToPath(new URL('../../', import.meta.url));
const base = join(repository, 'output', 'local-acceptance');
mkdirSync(base, { recursive: true });
const candidate = mkdtempSync(join(base, 'metadata-test-'));
const originalPath = join(repository, 'release', 'latest.yml');
let original: Buffer | null = null;
try { original = readFileSync(originalPath); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
try {
  writeFileSync(join(candidate, 'latest.yml'), 'version: 6.4.0\npath: untouched-installer.exe\n');
  const result = spawnSync(process.execPath, [resolve(repository, 'scripts/writeReleaseMetadata.cjs')], {
    cwd: repository, env: { ...process.env, HSL_RELEASE_OUTPUT_DIR: candidate }, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const updated = readFileSync(join(candidate, 'latest.yml'), 'utf8');
  assert.match(updated, /releaseSections:/);
  assert.match(updated, /untouched-installer\.exe/);
  if (original) assert.deepEqual(readFileSync(originalPath), original);
} finally {
  rmSync(candidate, { recursive: true, force: true });
}
console.log('Local acceptance output isolation, overwrite refusal, metadata CLI and publish-never arguments passed.');
