const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const zlib = require('node:zlib');
const yaml = require('js-yaml');
const { renderPlainReleaseNotes } = require('./writeReleaseMetadata.cjs');
const { resolveReleaseOutputDirectory } = require('../build/releaseOutputDirectory.cjs');

const BLOCKMAP_MAX_COMPRESSED_BYTES = 16 * 1024 * 1024;
const BLOCKMAP_MAX_DECOMPRESSED_BYTES = 64 * 1024 * 1024;
const VERSION_RESOURCE_ID = 16;
const VERSION_FIXED_FILE_INFO_BYTES = 52;
const VERSION_FIXED_FILE_INFO_SIGNATURE = 0xfeef04bd;
const PE_EXECUTABLE_CHARACTERISTIC = 0x0002;
const SUPPORTED_PE_MACHINES = new Set([0x014c, 0x8664, 0xaa64]);

const normalizeVersion = (value) => String(value || '').trim().replace(/^v/i, '');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const readNonEmptyFile = (filePath, releaseRealPath) => {
  const stat = fs.lstatSync(filePath);
  assert.equal(stat.isSymbolicLink(), false, `Release asset must not be a symbolic link: ${filePath}`);
  assert.equal(stat.isFile(), true, `Release asset is not a regular file: ${filePath}`);
  assert.equal(
    path.dirname(fs.realpathSync(filePath)),
    releaseRealPath,
    `Release asset resolves outside the release directory: ${filePath}`,
  );
  assert.ok(stat.size > 0, `Release asset is empty: ${filePath}`);
  return { bytes: fs.readFileSync(filePath), size: stat.size };
};

const getHashes = (bytes) => ({
  sha512: crypto.createHash('sha512').update(bytes).digest('base64'),
  sha512Hex: crypto.createHash('sha512').update(bytes).digest('hex'),
});

const assertBufferRange = (buffer, offset, length, label) => {
  assert.ok(
    Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length >= 0 &&
      offset <= buffer.length - length,
    `${label} is outside the file bounds`,
  );
};

const align4 = (value) => (value + 3) & ~3;

const readNullTerminatedUtf16 = (buffer, start, limit, label) => {
  assertBufferRange(buffer, start, 2, label);
  for (let offset = start; offset + 1 < limit; offset += 2) {
    if (buffer.readUInt16LE(offset) === 0) {
      return {
        value: buffer.subarray(start, offset).toString('utf16le'),
        nextOffset: offset + 2,
      };
    }
  }
  assert.fail(`${label} is not null terminated`);
};

const formatFixedVersion = (mostSignificant, leastSignificant) => ([
  mostSignificant >>> 16,
  mostSignificant & 0xffff,
  leastSignificant >>> 16,
  leastSignificant & 0xffff,
].join('.'));

const findVersionString = (versionResource, key) => {
  const encodedKey = Buffer.from(key, 'utf16le');
  let keyOffset = versionResource.indexOf(encodedKey);
  while (keyOffset >= 6) {
    const blockOffset = keyOffset - 6;
    const blockLength = versionResource.readUInt16LE(blockOffset);
    const valueLength = versionResource.readUInt16LE(blockOffset + 2);
    const type = versionResource.readUInt16LE(blockOffset + 4);
    const keyTerminatorOffset = keyOffset + encodedKey.length;
    const valueOffset = align4(keyTerminatorOffset + 2);
    const valueBytes = valueLength * 2;
    if (
      type === 1 &&
      blockLength >= valueOffset + valueBytes - blockOffset &&
      blockOffset + blockLength <= versionResource.length &&
      keyTerminatorOffset + 1 < versionResource.length &&
      versionResource.readUInt16LE(keyTerminatorOffset) === 0 &&
      valueBytes > 0
    ) {
      return versionResource
        .subarray(valueOffset, valueOffset + valueBytes)
        .toString('utf16le')
        .replace(/\0+$/u, '');
    }
    keyOffset = versionResource.indexOf(encodedKey, keyOffset + 2);
  }
  return null;
};

const verifyWindowsInstaller = (bytes, { version, productName }) => {
  assert.ok(bytes.length >= 0x100, 'Installer is too small to be a Windows PE executable');
  assert.equal(bytes.subarray(0, 2).toString('ascii'), 'MZ', 'Installer is missing the DOS MZ signature');
  const peOffset = bytes.readUInt32LE(0x3c);
  assertBufferRange(bytes, peOffset, 24, 'PE header');
  assert.equal(bytes.subarray(peOffset, peOffset + 4).toString('binary'), 'PE\0\0', 'Installer is missing the PE signature');

  const coffOffset = peOffset + 4;
  const machine = bytes.readUInt16LE(coffOffset);
  const sectionCount = bytes.readUInt16LE(coffOffset + 2);
  const optionalHeaderSize = bytes.readUInt16LE(coffOffset + 16);
  const characteristics = bytes.readUInt16LE(coffOffset + 18);
  assert.ok(SUPPORTED_PE_MACHINES.has(machine), `Installer uses an unsupported PE machine type: 0x${machine.toString(16)}`);
  assert.ok(sectionCount > 0 && sectionCount <= 96, 'Installer PE section count is invalid');
  assert.ok((characteristics & PE_EXECUTABLE_CHARACTERISTIC) !== 0, 'Installer PE image is not marked executable');

  const optionalHeaderOffset = coffOffset + 20;
  assertBufferRange(bytes, optionalHeaderOffset, optionalHeaderSize, 'PE optional header');
  const optionalMagic = bytes.readUInt16LE(optionalHeaderOffset);
  assert.ok(optionalMagic === 0x010b || optionalMagic === 0x020b, 'Installer must use a PE32 or PE32+ optional header');
  const numberOfDataDirectoriesOffset = optionalHeaderOffset + (optionalMagic === 0x010b ? 92 : 108);
  const dataDirectoriesOffset = optionalHeaderOffset + (optionalMagic === 0x010b ? 96 : 112);
  assertBufferRange(bytes, numberOfDataDirectoriesOffset, 4, 'PE data-directory count');
  assert.ok(bytes.readUInt32LE(numberOfDataDirectoriesOffset) > 2, 'Installer PE image has no resource directory entry');
  assertBufferRange(bytes, dataDirectoriesOffset + 16, 8, 'PE resource directory entry');
  const resourceRva = bytes.readUInt32LE(dataDirectoriesOffset + 16);
  const resourceSize = bytes.readUInt32LE(dataDirectoriesOffset + 20);
  assert.ok(resourceRva > 0 && resourceSize >= 24, 'Installer PE resource directory is empty');

  const sectionTableOffset = optionalHeaderOffset + optionalHeaderSize;
  assertBufferRange(bytes, sectionTableOffset, sectionCount * 40, 'PE section table');
  const sections = [];
  for (let index = 0; index < sectionCount; index += 1) {
    const offset = sectionTableOffset + index * 40;
    sections.push({
      virtualSize: bytes.readUInt32LE(offset + 8),
      virtualAddress: bytes.readUInt32LE(offset + 12),
      rawSize: bytes.readUInt32LE(offset + 16),
      rawOffset: bytes.readUInt32LE(offset + 20),
    });
  }
  const mapRvaToFileOffset = (rva, length, label) => {
    for (const section of sections) {
      const span = Math.max(section.virtualSize, section.rawSize);
      if (rva < section.virtualAddress || rva > section.virtualAddress + span - length) continue;
      const delta = rva - section.virtualAddress;
      assert.ok(delta <= section.rawSize - length, `${label} extends beyond the PE section's raw data`);
      const fileOffset = section.rawOffset + delta;
      assertBufferRange(bytes, fileOffset, length, label);
      return fileOffset;
    }
    assert.fail(`${label} RVA is not mapped by a PE section`);
  };

  const resourceFileOffset = mapRvaToFileOffset(resourceRva, resourceSize, 'PE resource directory');
  const readResourceEntries = (relativeOffset) => {
    assert.ok(relativeOffset <= resourceSize - 16, 'PE resource subdirectory offset is invalid');
    const directoryOffset = resourceFileOffset + relativeOffset;
    assertBufferRange(bytes, directoryOffset, 16, 'PE resource subdirectory');
    const namedCount = bytes.readUInt16LE(directoryOffset + 12);
    const idCount = bytes.readUInt16LE(directoryOffset + 14);
    const entryCount = namedCount + idCount;
    assert.ok(entryCount <= 4096, 'PE resource directory contains too many entries');
    assert.ok(relativeOffset + 16 + entryCount * 8 <= resourceSize, 'PE resource entries exceed the resource directory');
    return Array.from({ length: entryCount }, (_, index) => {
      const entryOffset = directoryOffset + 16 + index * 8;
      const name = bytes.readUInt32LE(entryOffset);
      const target = bytes.readUInt32LE(entryOffset + 4);
      return {
        id: name & 0xffff,
        named: (name & 0x80000000) !== 0,
        directory: (target & 0x80000000) !== 0,
        relativeOffset: target & 0x7fffffff,
      };
    });
  };
  const rootEntries = readResourceEntries(0);
  const versionEntry = rootEntries.find((entry) => !entry.named && entry.id === VERSION_RESOURCE_ID);
  assert.ok(versionEntry?.directory, 'Installer PE image has no VERSIONINFO resource directory');

  const findResourceDataEntry = (relativeOffset, depth = 0) => {
    assert.ok(depth < 4, 'VERSIONINFO resource directory nesting is invalid');
    for (const entry of readResourceEntries(relativeOffset)) {
      if (entry.directory) {
        const nested = findResourceDataEntry(entry.relativeOffset, depth + 1);
        if (nested) return nested;
      } else {
        assert.ok(entry.relativeOffset <= resourceSize - 16, 'VERSIONINFO data-entry offset is invalid');
        const dataEntryOffset = resourceFileOffset + entry.relativeOffset;
        assertBufferRange(bytes, dataEntryOffset, 16, 'VERSIONINFO data entry');
        return {
          rva: bytes.readUInt32LE(dataEntryOffset),
          size: bytes.readUInt32LE(dataEntryOffset + 4),
        };
      }
    }
    return null;
  };
  const versionDataEntry = findResourceDataEntry(versionEntry.relativeOffset);
  assert.ok(versionDataEntry && versionDataEntry.size >= VERSION_FIXED_FILE_INFO_BYTES, 'Installer VERSIONINFO data is empty');
  assert.ok(versionDataEntry.size <= 4 * 1024 * 1024, 'Installer VERSIONINFO resource is unreasonably large');
  const versionDataOffset = mapRvaToFileOffset(versionDataEntry.rva, versionDataEntry.size, 'VERSIONINFO resource');
  const versionResource = bytes.subarray(versionDataOffset, versionDataOffset + versionDataEntry.size);

  assertBufferRange(versionResource, 0, 6, 'VS_VERSION_INFO header');
  const rootLength = versionResource.readUInt16LE(0);
  const fixedValueLength = versionResource.readUInt16LE(2);
  const rootType = versionResource.readUInt16LE(4);
  assert.ok(rootLength >= 6 && rootLength <= versionResource.length, 'VS_VERSION_INFO length is invalid');
  const rootVersionResource = versionResource.subarray(0, rootLength);
  assert.equal(rootType, 0, 'VS_VERSION_INFO must contain binary fixed-version data');
  const rootKey = readNullTerminatedUtf16(rootVersionResource, 6, rootLength, 'VS_VERSION_INFO key');
  assert.equal(rootKey.value, 'VS_VERSION_INFO', 'Installer version resource has the wrong root key');
  const fixedOffset = align4(rootKey.nextOffset);
  assert.ok(fixedValueLength >= VERSION_FIXED_FILE_INFO_BYTES, 'VS_VERSION_INFO has no fixed file information');
  assertBufferRange(rootVersionResource, fixedOffset, VERSION_FIXED_FILE_INFO_BYTES, 'VS_FIXEDFILEINFO');
  assert.equal(
    rootVersionResource.readUInt32LE(fixedOffset),
    VERSION_FIXED_FILE_INFO_SIGNATURE,
    'Installer VS_FIXEDFILEINFO signature is invalid',
  );
  const fileVersion = formatFixedVersion(
    rootVersionResource.readUInt32LE(fixedOffset + 8),
    rootVersionResource.readUInt32LE(fixedOffset + 12),
  );
  const productVersion = formatFixedVersion(
    rootVersionResource.readUInt32LE(fixedOffset + 16),
    rootVersionResource.readUInt32LE(fixedOffset + 20),
  );
  const expectedFixedVersion = `${version}.0`;
  assert.equal(fileVersion, expectedFixedVersion, 'Installer fixed FileVersion does not match the release version');
  assert.equal(productVersion, expectedFixedVersion, 'Installer fixed ProductVersion does not match the release version');

  const versionStrings = {
    productName: findVersionString(rootVersionResource, 'ProductName'),
    productVersionString: findVersionString(rootVersionResource, 'ProductVersion'),
    fileVersionString: findVersionString(rootVersionResource, 'FileVersion'),
  };
  assert.equal(versionStrings.productName, productName, 'Installer ProductName does not match package.json');
  assert.ok(
    versionStrings.productVersionString === version || versionStrings.productVersionString === expectedFixedVersion,
    'Installer ProductVersion string does not match the release version',
  );
  assert.ok(
    versionStrings.fileVersionString === version || versionStrings.fileVersionString === expectedFixedVersion,
    'Installer FileVersion string does not match the release version',
  );

  return { machine, optionalMagic, fileVersion, productVersion, ...versionStrings };
};

const verifyBlockmapSchema = (bytes, installerSize) => {
  assert.ok(bytes.length <= BLOCKMAP_MAX_COMPRESSED_BYTES, 'Blockmap exceeds the compressed-size safety limit');
  assert.equal(bytes[0], 0x1f, 'Blockmap is not gzip-compressed');
  assert.equal(bytes[1], 0x8b, 'Blockmap is not gzip-compressed');
  let decompressed;
  try {
    decompressed = zlib.gunzipSync(bytes, { maxOutputLength: BLOCKMAP_MAX_DECOMPRESSED_BYTES });
  } catch (error) {
    assert.fail(`Blockmap gzip stream is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(decompressed);
  } catch (error) {
    assert.fail(`Blockmap is not valid UTF-8: ${error instanceof Error ? error.message : String(error)}`);
  }
  let blockmap;
  try {
    blockmap = JSON.parse(source);
  } catch (error) {
    assert.fail(`Blockmap JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert.ok(blockmap && typeof blockmap === 'object' && !Array.isArray(blockmap), 'Blockmap root must be an object');
  assert.deepEqual(Object.keys(blockmap).sort(), ['files', 'version'], 'Blockmap root schema contains unexpected fields');
  assert.equal(blockmap.version, '2', 'Blockmap schema version must be 2');
  assert.ok(Array.isArray(blockmap.files), 'Blockmap files must be an array');
  assert.equal(blockmap.files.length, 1, 'Blockmap must describe exactly one installer file');
  const file = blockmap.files[0];
  assert.ok(file && typeof file === 'object' && !Array.isArray(file), 'Blockmap file entry must be an object');
  assert.deepEqual(
    Object.keys(file).sort(),
    ['checksums', 'name', 'offset', 'sizes'],
    'Blockmap file schema contains unexpected fields',
  );
  assert.equal(file.name, 'file', 'Blockmap file entry name must be canonical');
  assert.equal(file.offset, 0, 'Blockmap file entry must start at offset zero');
  assert.ok(Array.isArray(file.checksums) && file.checksums.length > 0, 'Blockmap checksums must be non-empty');
  assert.ok(Array.isArray(file.sizes), 'Blockmap sizes must be an array');
  assert.equal(file.checksums.length, file.sizes.length, 'Blockmap checksum and size counts differ');
  file.checksums.forEach((checksum) => {
    assert.match(checksum, /^[A-Za-z0-9+/]{24}$/u, 'Blockmap checksum is not canonical base64');
    const decoded = Buffer.from(checksum, 'base64');
    assert.equal(decoded.length, 18, 'Blockmap checksum must contain 18 bytes');
    assert.equal(decoded.toString('base64'), checksum, 'Blockmap checksum base64 is not canonical');
  });
  const totalSize = file.sizes.reduce((sum, size) => {
    assert.ok(Number.isSafeInteger(size) && size > 0, 'Blockmap chunk size must be a positive safe integer');
    return sum + size;
  }, 0);
  assert.equal(totalSize, installerSize, 'Blockmap chunk sizes do not sum to the installer size');
  return { chunkCount: file.sizes.length, decompressedSize: decompressed.length };
};

const resolveBlockmapBuilderScriptPath = () => path.join(__dirname, 'regenerateBlockmap.cjs');

const verifyRegeneratedBlockmap = ({
  installerPath,
  blockmapPath,
  blockmapBytes,
  blockmapBuilderScriptPath,
}) => {
  const builderScriptPath = blockmapBuilderScriptPath || resolveBlockmapBuilderScriptPath();
  const builderScript = fs.statSync(builderScriptPath);
  assert.equal(builderScript.isFile(), true, `blockmap builder script is missing: ${builderScriptPath}`);
  const releaseDir = path.dirname(blockmapPath);
  const temporaryDir = fs.mkdtempSync(path.join(releaseDir, '.verify-blockmap-'));
  const regeneratedPath = path.join(temporaryDir, path.basename(blockmapPath));
  try {
    const result = spawnSync(process.execPath, [
      builderScriptPath,
      installerPath,
      regeneratedPath,
    ], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      timeout: 120_000,
      windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(
      result.status,
      0,
      `electron-builder could not regenerate the blockmap: ${(result.stderr || result.stdout || '').trim()}`,
    );
    const regeneratedBytes = fs.readFileSync(regeneratedPath);
    assert.equal(regeneratedBytes.length, blockmapBytes.length, 'Blockmap bytes differ from app-builder regeneration');
    assert.ok(
      crypto.timingSafeEqual(regeneratedBytes, blockmapBytes),
      'Blockmap bytes differ from app-builder regeneration',
    );
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  }
};

const verifyReleaseAssets = ({
  rootDir = path.resolve(__dirname, '..'),
  version: requestedVersion,
  blockmapBuilderScriptPath,
  outputDirectory = process.env.HSL_RELEASE_OUTPUT_DIR,
} = {}) => {
  const packageJson = readJson(path.join(rootDir, 'package.json'));
  const packageLock = readJson(path.join(rootDir, 'package-lock.json'));
  const releaseCatalog = readJson(path.join(rootDir, 'docs', 'releases', 'release-notes.json'));
  const version = normalizeVersion(requestedVersion || packageJson.version);
  assert.match(version, /^\d+\.\d+\.\d+$/u, 'Release version must be a stable three-part numeric version');
  assert.equal(normalizeVersion(packageJson.version), version, 'package.json version does not match the requested release');
  assert.equal(normalizeVersion(packageLock.version), version, 'package-lock.json version does not match package.json');
  assert.equal(normalizeVersion(packageLock.packages?.['']?.version), version, 'package-lock root package version is stale');

  const publishTarget = (packageJson.build?.publish || []).find((entry) => entry?.provider === 'github');
  assert.ok(publishTarget?.owner && publishTarget?.repo, 'A GitHub electron-builder publish target is required');
  const productName = packageJson.build?.productName || packageJson.productName || packageJson.name;
  assert.ok(typeof productName === 'string' && productName.length > 0, 'A desktop ProductName is required');
  const tag = `v${version}`;
  const installerName = `heat-capacity-lab-setup-${version}.exe`;
  const blockmapName = `${installerName}.blockmap`;
  const latestName = 'latest.yml';
  const releaseDir = resolveReleaseOutputDirectory(rootDir, outputDirectory);
  const releaseRealPath = fs.realpathSync(releaseDir);
  const expectedNames = [installerName, blockmapName, latestName];
  const currentVersionAssetNames = fs.readdirSync(releaseDir)
    .filter((name) => name.startsWith(installerName))
    .sort();
  assert.deepEqual(
    currentVersionAssetNames,
    [blockmapName, installerName].sort(),
    'Release directory contains an unexpected current-version installer asset',
  );
  const assetFiles = expectedNames.map((name) => ({
    name,
    path: path.join(releaseDir, name),
  }));
  const assetContents = assetFiles.map((asset) => ({
    ...asset,
    ...readNonEmptyFile(asset.path, releaseRealPath),
  }));
  const assets = assetContents.map(({ bytes, ...asset }) => ({ ...asset, ...getHashes(bytes) }));
  const installer = assets[0];
  const installerBytes = assetContents[0].bytes;
  const blockmapBytes = assetContents[1].bytes;

  const installerMetadata = verifyWindowsInstaller(installerBytes, { version, productName });
  const blockmapMetadata = verifyBlockmapSchema(blockmapBytes, installer.size);
  verifyRegeneratedBlockmap({
    installerPath: assetFiles[0].path,
    blockmapPath: assetFiles[1].path,
    blockmapBytes,
    blockmapBuilderScriptPath,
  });

  const latestPath = assetFiles[2].path;
  const latest = yaml.load(fs.readFileSync(latestPath, 'utf8'));
  assert.ok(latest && typeof latest === 'object' && !Array.isArray(latest), 'latest.yml must contain a mapping');
  assert.deepEqual(
    Object.keys(latest).sort(),
    [
      'files',
      'manualDownloadUrl',
      'path',
      'releaseDate',
      'releaseNotes',
      'releasePageUrl',
      'releaseSections',
      'releaseSummary',
      'sha512',
      'version',
    ],
    'latest.yml contains missing or unexpected fields',
  );
  assert.equal(normalizeVersion(latest.version), version, 'latest.yml version is stale');
  assert.equal(latest.path, installerName, 'latest.yml path does not match the installer asset');
  assert.equal(latest.sha512, installer.sha512, 'latest.yml installer SHA-512 does not match local bytes');
  assert.ok(Array.isArray(latest.files), 'latest.yml files must be an array');
  assert.equal(latest.files.length, 1, 'latest.yml must select exactly one installer file');
  assert.deepEqual(Object.keys(latest.files[0] || {}).sort(), ['sha512', 'size', 'url'], 'latest.yml file schema is invalid');
  assert.equal(latest.files[0]?.url, installerName, 'latest.yml files[0].url does not match the installer');
  assert.equal(latest.files[0]?.sha512, installer.sha512, 'latest.yml files[0] SHA-512 does not match local bytes');
  assert.equal(latest.files[0]?.size, installer.size, 'latest.yml installer size does not match local bytes');
  assert.ok(typeof latest.releaseDate === 'string', 'latest.yml releaseDate must be an ISO timestamp');
  const releaseDateMs = Date.parse(latest.releaseDate);
  assert.ok(Number.isFinite(releaseDateMs), 'latest.yml releaseDate is invalid');
  assert.equal(new Date(releaseDateMs).toISOString(), latest.releaseDate, 'latest.yml releaseDate is not canonical ISO-8601');

  const releases = Array.isArray(releaseCatalog.releases) ? releaseCatalog.releases : [];
  const releaseNotes = releases.find((release) => normalizeVersion(release?.version) === version);
  assert.ok(releaseNotes, `No structured release notes exist for ${version}`);
  assert.equal(normalizeVersion(releases[0]?.version), version, 'The current release notes must be first in the catalog');
  const releasePageUrl = `https://github.com/${publishTarget.owner}/${publishTarget.repo}/releases/tag/${tag}`;
  const manualDownloadUrl = `https://github.com/${publishTarget.owner}/${publishTarget.repo}/releases/download/${tag}/${installerName}`;
  assert.equal(releaseNotes.download?.releasePage, releasePageUrl, 'Structured release page URL is incorrect');
  assert.equal(releaseNotes.download?.windowsInstaller, manualDownloadUrl, 'Structured manual installer URL is incorrect');
  assert.equal(latest.releasePageUrl, releasePageUrl, 'latest.yml release page URL is incorrect');
  assert.equal(latest.manualDownloadUrl, manualDownloadUrl, 'latest.yml manual download URL is incorrect');
  assert.deepEqual(latest.releaseSummary, releaseNotes.summary, 'latest.yml structured release summary is stale');
  assert.deepEqual(latest.releaseSections, releaseNotes.sections, 'latest.yml structured release sections are stale');
  assert.equal(latest.releaseNotes, renderPlainReleaseNotes(releaseNotes), 'latest.yml plain release notes are stale');

  return {
    version,
    tag,
    expectedNames,
    releasePageUrl,
    manualDownloadUrl,
    installerMetadata,
    blockmapMetadata,
    assets,
  };
};

if (require.main === module) {
  const result = verifyReleaseAssets({ version: process.argv[2] });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  verifyBlockmapSchema,
  verifyReleaseAssets,
  verifyWindowsInstaller,
};
