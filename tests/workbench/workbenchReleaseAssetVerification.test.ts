import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

type ReleaseVerificationResult = {
  expectedNames: string[];
  installerMetadata: { productName: string; fileVersion: string; productVersion: string };
  blockmapMetadata: { chunkCount: number; decompressedSize: number };
  assets: Array<{ name: string; size: number; sha512: string; sha512Hex: string }>;
};

const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as { dump: (value: unknown, options?: unknown) => string };
const { renderPlainReleaseNotes } = require('../../scripts/writeReleaseMetadata.cjs') as {
  renderPlainReleaseNotes: (release: unknown) => string;
};
const { verifyBlockmapSchema, verifyReleaseAssets } = require('../../scripts/verifyReleaseAssets.cjs') as {
  verifyBlockmapSchema: (bytes: Buffer, installerSize: number) => unknown;
  verifyReleaseAssets: (options: {
    rootDir: string;
    version?: string;
    appBuilderPath?: string;
  }) => ReleaseVerificationResult;
};

const align4 = (value: number) => (value + 3) & ~3;
const utf16z = (value: string) => Buffer.from(`${value}\0`, 'utf16le');

const createVersionBlock = ({
  key,
  type,
  value = Buffer.alloc(0),
  valueLength = 0,
  children = [],
}: {
  key: string;
  type: 0 | 1;
  value?: Buffer;
  valueLength?: number;
  children?: Buffer[];
}) => {
  const chunks: Buffer[] = [Buffer.alloc(6), utf16z(key)];
  let length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (align4(length) > length) {
    chunks.push(Buffer.alloc(align4(length) - length));
    length = align4(length);
  }
  if (value.length > 0) {
    chunks.push(value);
    length += value.length;
  }
  if (children.length > 0 && align4(length) > length) {
    chunks.push(Buffer.alloc(align4(length) - length));
    length = align4(length);
  }
  children.forEach((child, index) => {
    if (index > 0 && align4(length) > length) {
      chunks.push(Buffer.alloc(align4(length) - length));
      length = align4(length);
    }
    chunks.push(child);
    length += child.length;
  });
  const block = Buffer.concat(chunks);
  block.writeUInt16LE(block.length, 0);
  block.writeUInt16LE(valueLength, 2);
  block.writeUInt16LE(type, 4);
  return block;
};

const createVersionString = (key: string, value: string) => createVersionBlock({
  key,
  type: 1,
  value: utf16z(value),
  valueLength: value.length + 1,
});

const createVersionResource = (
  version: string,
  productName: string,
  includeProductName = true,
) => {
  const [major, minor, patch] = version.split('.').map(Number);
  const versionMostSignificant = (major << 16) | minor;
  const versionLeastSignificant = patch << 16;
  const fixed = Buffer.alloc(52);
  fixed.writeUInt32LE(0xfeef04bd, 0);
  fixed.writeUInt32LE(0x00010000, 4);
  fixed.writeUInt32LE(versionMostSignificant, 8);
  fixed.writeUInt32LE(versionLeastSignificant, 12);
  fixed.writeUInt32LE(versionMostSignificant, 16);
  fixed.writeUInt32LE(versionLeastSignificant, 20);
  fixed.writeUInt32LE(0x3f, 24);
  fixed.writeUInt32LE(0, 28);
  fixed.writeUInt32LE(0x00040004, 32);
  fixed.writeUInt32LE(1, 36);

  const stringTable = createVersionBlock({
    key: '040904B0',
    type: 1,
    children: [
      ...(includeProductName ? [createVersionString('ProductName', productName)] : []),
      createVersionString('ProductVersion', version),
      createVersionString('FileVersion', version),
    ],
  });
  const stringFileInfo = createVersionBlock({
    key: 'StringFileInfo',
    type: 1,
    children: [stringTable],
  });
  return createVersionBlock({
    key: 'VS_VERSION_INFO',
    type: 0,
    value: fixed,
    valueLength: fixed.length,
    children: [stringFileInfo],
  });
};

const createPeInstallerFixture = (
  version: string,
  productName: string,
  options: { productNameOutsideRoot?: boolean } = {},
) => {
  const rootVersionResource = createVersionResource(
    version,
    productName,
    !options.productNameOutsideRoot,
  );
  const versionResource = options.productNameOutsideRoot
    ? Buffer.concat([rootVersionResource, createVersionString('ProductName', productName)])
    : rootVersionResource;
  const headerSize = 0x200;
  const resourceRawSize = 0x1000;
  const resourceRva = 0x1000;
  const versionResourceOffset = 0x80;
  assert.ok(versionResourceOffset + versionResource.length <= resourceRawSize);
  const bytes = Buffer.alloc(headerSize + resourceRawSize);
  bytes.write('MZ', 0, 'ascii');
  bytes.writeUInt32LE(0x80, 0x3c);
  bytes.write('PE\0\0', 0x80, 'binary');
  const coffOffset = 0x84;
  bytes.writeUInt16LE(0x014c, coffOffset);
  bytes.writeUInt16LE(1, coffOffset + 2);
  bytes.writeUInt16LE(0xe0, coffOffset + 16);
  bytes.writeUInt16LE(0x0102, coffOffset + 18);
  const optionalOffset = coffOffset + 20;
  bytes.writeUInt16LE(0x010b, optionalOffset);
  bytes.writeUInt32LE(16, optionalOffset + 92);
  bytes.writeUInt32LE(resourceRva, optionalOffset + 112);
  bytes.writeUInt32LE(versionResourceOffset + versionResource.length, optionalOffset + 116);
  const sectionOffset = optionalOffset + 0xe0;
  bytes.write('.rsrc\0\0\0', sectionOffset, 'binary');
  bytes.writeUInt32LE(resourceRawSize, sectionOffset + 8);
  bytes.writeUInt32LE(resourceRva, sectionOffset + 12);
  bytes.writeUInt32LE(resourceRawSize, sectionOffset + 16);
  bytes.writeUInt32LE(headerSize, sectionOffset + 20);

  const resourceOffset = headerSize;
  bytes.writeUInt16LE(1, resourceOffset + 14);
  bytes.writeUInt32LE(16, resourceOffset + 16);
  bytes.writeUInt32LE(0x80000020, resourceOffset + 20);
  bytes.writeUInt16LE(1, resourceOffset + 0x20 + 14);
  bytes.writeUInt32LE(1, resourceOffset + 0x20 + 16);
  bytes.writeUInt32LE(0x80000040, resourceOffset + 0x20 + 20);
  bytes.writeUInt16LE(1, resourceOffset + 0x40 + 14);
  bytes.writeUInt32LE(0x0409, resourceOffset + 0x40 + 16);
  bytes.writeUInt32LE(0x60, resourceOffset + 0x40 + 20);
  bytes.writeUInt32LE(resourceRva + versionResourceOffset, resourceOffset + 0x60);
  bytes.writeUInt32LE(versionResource.length, resourceOffset + 0x64);
  versionResource.copy(bytes, resourceOffset + versionResourceOffset);
  return bytes;
};

const testDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDirectory, '..', '..');
const platformFolder = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux';
const appBuilderPath = join(
  projectRoot,
  'node_modules',
  'app-builder-bin',
  platformFolder,
  process.arch,
  process.platform === 'win32' ? 'app-builder.exe' : 'app-builder',
);
const rootDir = mkdtempSync(join(tmpdir(), 'hsl-release-verification-'));
try {
  const version = '5.1.2';
  const productName = 'Heat Capacity Ratio Lab';
  const installerName = `heat-capacity-lab-setup-${version}.exe`;
  const blockmapName = `${installerName}.blockmap`;
  const summary = { 'zh-CN': 'Stable', 'zh-TW': 'Stable', en: 'Stable' };
  const sections = [{ id: 'reliability', title: summary, items: [] }];
  const releasePageUrl = `https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/releases/tag/v${version}`;
  const manualDownloadUrl = `https://github.com/yanshi-qibixunchang/hard-sphere-lab-release/releases/download/v${version}/${installerName}`;
  const release = {
    version,
    summary,
    sections,
    download: { releasePage: releasePageUrl, windowsInstaller: manualDownloadUrl },
  };
  mkdirSync(join(rootDir, 'docs', 'releases'), { recursive: true });
  mkdirSync(join(rootDir, 'release'), { recursive: true });
  writeFileSync(join(rootDir, 'package.json'), JSON.stringify({
    version,
    build: {
      productName,
      publish: [{ provider: 'github', owner: 'yanshi-qibixunchang', repo: 'hard-sphere-lab-release' }],
    },
  }));
  writeFileSync(join(rootDir, 'package-lock.json'), JSON.stringify({
    version,
    packages: { '': { version } },
  }));
  writeFileSync(join(rootDir, 'docs', 'releases', 'release-notes.json'), JSON.stringify({ releases: [release] }));
  const installerPath = join(rootDir, 'release', installerName);
  const blockmapPath = join(rootDir, 'release', blockmapName);
  const latestPath = join(rootDir, 'release', 'latest.yml');
  const installerBytes = createPeInstallerFixture(version, productName);
  writeFileSync(installerPath, installerBytes);
  const blockmapResult = spawnSync(appBuilderPath, [
    'blockmap',
    '--input', installerPath,
    '--output', blockmapPath,
  ], { encoding: 'utf8', windowsHide: true });
  assert.ifError(blockmapResult.error);
  assert.equal(blockmapResult.status, 0, blockmapResult.stderr || blockmapResult.stdout);
  const validBlockmap = readFileSync(blockmapPath);
  const installerSha512 = crypto.createHash('sha512').update(installerBytes).digest('base64');
  const validLatest = {
    version,
    files: [{ url: installerName, sha512: installerSha512, size: installerBytes.length }],
    path: installerName,
    sha512: installerSha512,
    releaseDate: '2026-07-16T00:00:00.000Z',
    releasePageUrl,
    manualDownloadUrl,
    releaseSummary: summary,
    releaseSections: sections,
    releaseNotes: renderPlainReleaseNotes(release),
  };
  const writeLatest = (value: unknown = validLatest) => {
    writeFileSync(latestPath, yaml.dump(value, { lineWidth: -1, noRefs: true }));
  };
  writeLatest();

  const result = verifyReleaseAssets({ rootDir, appBuilderPath });
  assert.deepEqual(result.expectedNames, [installerName, blockmapName, 'latest.yml']);
  assert.equal(result.assets.length, 3);
  assert.equal(result.installerMetadata.productName, productName);
  assert.equal(result.installerMetadata.fileVersion, '5.1.2.0');
  assert.equal(result.installerMetadata.productVersion, '5.1.2.0');
  assert.ok(result.blockmapMetadata.chunkCount > 0 && result.blockmapMetadata.decompressedSize > 0);
  assert.ok(result.assets.every((asset) => asset.size > 0 && asset.sha512.length > 0 && asset.sha512Hex.length === 128));

  writeLatest({
    ...validLatest,
    files: [{ ...validLatest.files[0], size: installerBytes.length + 1 }],
  });
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /installer size does not match local bytes/,
    'the release gate must reject stale latest.yml sizes',
  );
  writeLatest();

  writeFileSync(installerPath, Buffer.from('installer-fixture'));
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /DOS MZ signature|too small/,
    'plain text must never pass as a Windows installer',
  );
  writeFileSync(installerPath, installerBytes);

  writeFileSync(installerPath, createPeInstallerFixture(version, 'Wrong Product'));
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /ProductName does not match/,
    'the installer VERSIONINFO ProductName must match package.json exactly',
  );
  writeFileSync(installerPath, installerBytes);

  writeFileSync(
    installerPath,
    createPeInstallerFixture(version, productName, { productNameOutsideRoot: true }),
  );
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /ProductName does not match/,
    'VERSIONINFO strings outside the declared root block must not satisfy installer metadata checks',
  );
  writeFileSync(installerPath, installerBytes);

  const outsideInstallerPath = join(rootDir, 'outside-installer.exe');
  writeFileSync(outsideInstallerPath, installerBytes);
  let symlinkCreated = false;
  try {
    rmSync(installerPath);
    symlinkSync(outsideInstallerPath, installerPath, 'file');
    symlinkCreated = true;
    assert.throws(
      () => verifyReleaseAssets({ rootDir, appBuilderPath }),
      /symbolic link|resolves outside/,
      'release assets must be regular files physically located in the release directory',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
  } finally {
    if (symlinkCreated) rmSync(installerPath);
    writeFileSync(installerPath, installerBytes);
  }

  writeFileSync(blockmapPath, Buffer.concat([validBlockmap, Buffer.from([0])]));
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /Blockmap bytes differ from app-builder regeneration/,
    'trailing or otherwise non-canonical blockmap bytes must fail closed',
  );
  writeFileSync(blockmapPath, validBlockmap);

  assert.throws(
    () => verifyBlockmapSchema(gzipSync(Buffer.from(JSON.stringify({
      version: '2',
      files: [{ name: 'file', offset: 0, checksums: ['not-base64'], sizes: [installerBytes.length] }],
    }))), installerBytes.length),
    /checksum is not canonical base64/,
    'blockmap checksum entries must be canonical 18-byte base64 values',
  );

  writeLatest({ ...validLatest, releaseNotes: 'stale notes' });
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /plain release notes are stale/,
    'latest.yml plain notes must exactly match the shared release-note renderer',
  );
  writeLatest();

  writeFileSync(join(rootDir, 'release', `${installerName}.unexpected`), Buffer.from('unexpected'));
  assert.throws(
    () => verifyReleaseAssets({ rootDir, appBuilderPath }),
    /unexpected current-version installer asset/,
    'the upload gate must expose exactly the installer and its matching blockmap for the current version',
  );
} finally {
  rmSync(rootDir, { recursive: true, force: true });
}

console.log('workbenchReleaseAssetVerification tests passed');
