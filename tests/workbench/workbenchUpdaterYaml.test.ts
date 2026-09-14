import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const providerPath = require.resolve('electron-updater/out/providers/Provider.js');
const updaterRequire = createRequire(providerPath);
const yaml = updaterRequire('js-yaml') as {
  load: (source: string, options?: { maxTotalMergeKeys: number }) => unknown;
  dump: (value: unknown, options: { lineWidth: number; noRefs: boolean }) => string;
};
const { parseUpdateInfo, resolveFiles } = require(providerPath) as {
  parseUpdateInfo: (source: string | null, file: string, url: string) => unknown;
  resolveFiles: (info: unknown, baseUrl: URL) => Array<{
    url: URL; info: { url: string; sha512?: string; size?: number };
  }>;
};
const { getReleaseMetadataForUpdateInfo } = require('../../electron/updaterMetadata.cjs') as {
  getReleaseMetadataForUpdateInfo: (info: unknown) => {
    releasePageUrl: string; manualDownloadUrl: string;
    releaseSummary: unknown; releaseSections: unknown; releaseNotes: string;
  };
};
const { findRelease, renderPlainReleaseNotes } = require('../../scripts/writeReleaseMetadata.cjs') as {
  findRelease: (version: string) => {
    summary: unknown; sections: unknown;
    download: { releasePage: string; windowsInstaller: string };
  };
  renderPlainReleaseNotes: (release: unknown) => string;
};
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const release = findRelease(packageJson.version);
assert.ok(release, 'the current release notes must exist');
assert.equal(updaterRequire.resolve('js-yaml'), require.resolve('js-yaml'),
  'the updater must use the same patched parser as release metadata generation');

// In-memory manifest only: no release files, installer downloads or HTTP calls.
const assetUrl = new URL(release.download.windowsInstaller);
const baseUrl = new URL('./', assetUrl);
const assetName = assetUrl.pathname.split('/').at(-1)!;
const digest = createHash('sha512').update('local updater metadata fixture').digest('base64');
const manifest = {
  version: packageJson.version,
  files: [{ url: assetName, sha512: digest, size: 2048 }],
  path: assetName,
  sha512: digest,
  releaseDate: '2026-09-14T00:00:00.000Z',
  releasePageUrl: release.download.releasePage,
  manualDownloadUrl: release.download.windowsInstaller,
  releaseSummary: release.summary,
  releaseSections: release.sections,
  releaseNotes: renderPlainReleaseNotes(release),
};
const source = yaml.dump(manifest, { lineWidth: -1, noRefs: true });
const channelUrl = new URL('latest.yml', baseUrl).href;
const parse = (raw: string | null) => parseUpdateInfo(raw, 'latest.yml', channelUrl);
const parsed = parse(source);
assert.deepEqual(parsed, manifest, 'dates, Unicode notes and structured sections must survive YAML');
const files = resolveFiles(parsed, baseUrl);
assert.equal(files.length, 1);
assert.equal(files[0]!.url.href, assetUrl.href);
assert.deepEqual(files[0]!.info, manifest.files[0]);
const metadata = getReleaseMetadataForUpdateInfo(parsed);
assert.equal(metadata.manualDownloadUrl, manifest.manualDownloadUrl);
assert.equal(metadata.releasePageUrl, manifest.releasePageUrl);
assert.deepEqual(metadata.releaseSummary, manifest.releaseSummary);
assert.deepEqual(metadata.releaseSections, manifest.releaseSections);
assert.ok(metadata.releaseNotes.includes(packageJson.version));

const legacy = { version: packageJson.version, path: assetName, sha512: digest };
const legacyFiles = resolveFiles(parse(yaml.dump(legacy, { lineWidth: -1, noRefs: true })), baseUrl);
assert.equal(legacyFiles[0]!.url.href, assetUrl.href);
assert.equal(legacyFiles[0]!.info.sha512, digest);
assert.throws(() => parse(null), { code: 'ERR_UPDATER_INVALID_UPDATE_INFO' });
assert.throws(() => parse('files: [unterminated'), { code: 'ERR_UPDATER_INVALID_UPDATE_INFO' });
assert.throws(() => resolveFiles({ files: [{ url: assetName }] }, baseUrl), { code: 'ERR_UPDATER_NO_CHECKSUM' });

// Tiny bounded fixture for GHSA-2883-xcg3-v3hh. A budget must include empty
// sources too; test behavior instead of freezing the dependency version string.
const emptyMerges = 'empty: &empty [{}, {}, {}]\na: {<<: *empty}\nb: {<<: *empty}\n';
assert.deepEqual(yaml.load(emptyMerges, { maxTotalMergeKeys: 12 }), {
  empty: [{}, {}, {}], a: {}, b: {},
});
assert.throws(() => yaml.load(emptyMerges, { maxTotalMergeKeys: 4 }), /maxTotalMergeKeys/,
  'empty mapping sources must consume the merge work budget');

// Exercise the real updater entry point with its default parser options.
// Each sequence stays within the parser's separate length limit. Even the
// vulnerable parser performs only 10,100 visits on this fixture.
const defaultBudgetFixture = 'empty: &empty [' + Array(100).fill('{}').join(',')
  + ']\ntargets:\n' + '  - <<: *empty\n'.repeat(101);
assert.throws(() => parse(defaultBudgetFixture), (error: unknown) => {
  assert.ok(error instanceof Error && 'code' in error);
  assert.equal(error.code, 'ERR_UPDATER_INVALID_UPDATE_INFO');
  assert.match(error.message, /maxTotalMergeKeys/);
  return true;
});
const oversizedSequence = 'target: {<<: [' + Array(101).fill('{}').join(',') + ']}';
assert.throws(() => parse(oversizedSequence), { code: 'ERR_UPDATER_INVALID_UPDATE_INFO' });
assert.deepEqual(parse(source), manifest, 'a rejected manifest must not poison the next check');

console.log('Updater YAML tests passed: real provider parsing, release metadata, file resolution, malformed input and bounded empty-merge rejection.');
