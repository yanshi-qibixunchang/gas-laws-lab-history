import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const packagedRoot = mkdtempSync(join(tmpdir(), 'hsl-packaged-updater-'));

try {
  mkdirSync(join(packagedRoot, 'electron'), { recursive: true });
  mkdirSync(join(packagedRoot, 'docs', 'releases'), { recursive: true });
  copyFileSync(
    join(projectRoot, 'electron', 'updaterMetadata.cjs'),
    join(packagedRoot, 'electron', 'updaterMetadata.cjs'),
  );
  copyFileSync(
    join(projectRoot, 'electron', 'runtimeReleaseConfig.cjs'),
    join(packagedRoot, 'electron', 'runtimeReleaseConfig.cjs'),
  );
  copyFileSync(
    join(projectRoot, 'docs', 'releases', 'release-notes.json'),
    join(packagedRoot, 'docs', 'releases', 'release-notes.json'),
  );
  writeFileSync(
    join(packagedRoot, 'package.json'),
    JSON.stringify({
      name: 'hard-sphere-lab',
      version: '5.1.2',
      main: 'electron/main.cjs',
      dependencies: { 'electron-updater': '^6.8.3' },
    }),
  );

  const packagedRequire = createRequire(join(packagedRoot, 'packaged-entry.cjs'));
  const {
    getLatestReleasePageUrl,
    getManualRecoveryTargetUrl,
    getReleaseMetadataForVersion,
    isAllowedManualDownloadUrl,
  } = packagedRequire(join(packagedRoot, 'electron', 'updaterMetadata.cjs')) as {
    getLatestReleasePageUrl: () => string | null;
    getManualRecoveryTargetUrl: (state: {
      errorStage?: 'check' | 'download' | null;
      releasePageUrl?: string | null;
      manualDownloadUrl?: string | null;
    }) => string | null;
    getReleaseMetadataForVersion: (version: string) => {
      releasePageUrl: string | null;
      manualDownloadUrl: string | null;
    };
    isAllowedManualDownloadUrl: (url: string | null) => boolean;
  };

  const latestUrl = getLatestReleasePageUrl();
  const release = getReleaseMetadataForVersion('5.1.3');
  assert.equal(
    latestUrl,
    'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/releases/latest',
    'electron-builder-pruned packages must retain the trusted latest-release recovery URL',
  );
  assert.equal(
    release.manualDownloadUrl,
    'https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/releases/download/v5.1.3/heat-capacity-lab-setup-5.1.3.exe',
    'electron-builder-pruned packages must retain stable future installer URL generation',
  );
  assert.equal(
    isAllowedManualDownloadUrl(latestUrl),
    true,
    'the packaged latest-release recovery URL must remain on the strict allowlist',
  );
  assert.equal(
    isAllowedManualDownloadUrl(release.manualDownloadUrl),
    true,
    'the packaged direct installer URL must remain on the strict allowlist',
  );
  assert.equal(
    getManualRecoveryTargetUrl({
      errorStage: 'check',
      releasePageUrl: release.releasePageUrl,
      manualDownloadUrl: release.manualDownloadUrl,
    }),
    latestUrl,
    'a later update-check failure must ignore stale discovered metadata and open the trusted latest release page',
  );
  assert.equal(
    getManualRecoveryTargetUrl({
      errorStage: 'download',
      releasePageUrl: release.releasePageUrl,
      manualDownloadUrl: release.manualDownloadUrl,
    }),
    release.manualDownloadUrl,
    'a confirmed download failure should retain its exact discovered installer target',
  );
  assert.equal(
    isAllowedManualDownloadUrl('https://github.com/yanshi-qibixunchang/other/releases/latest'),
    false,
    'the packaged allowlist must still reject unrelated repositories',
  );
} finally {
  rmSync(packagedRoot, { recursive: true, force: true });
}

console.log('workbenchPackagedUpdaterMetadata tests passed');
