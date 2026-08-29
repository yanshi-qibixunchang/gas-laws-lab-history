import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { audioCatalog } from '../../src/audio/catalog/audioCatalog.ts';
import type { ExperimentAudioManifest } from '../../src/audio/catalog/audioManifestTypes.ts';

const projectRoot = process.cwd();
const audioRoot = join(projectRoot, 'public', 'audio');
const runtimeRoot = join(audioRoot, 'experiments', 'piston-oscillation');
const projectManifest = JSON.parse(readFileSync(join(audioRoot, 'manifest.json'), 'utf8'));
const manifest = JSON.parse(
  readFileSync(join(runtimeRoot, 'manifest.json'), 'utf8'),
) as ExperimentAudioManifest;

const readPcmWavMetadata = (buffer: Buffer) => {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
  let offset = 12;
  let format: {
    audioFormat: number;
    channels: number;
    sampleRateHz: number;
    bitsPerSample: number;
  } | null = null;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRateHz: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  assert.ok(format, 'WAV should contain a fmt chunk');
  assert.ok(dataSize > 0, 'WAV should contain non-empty PCM data');
  const bytesPerFrame = format.channels * format.bitsPerSample / 8;
  return {
    ...format,
    durationS: dataSize / bytesPerFrame / format.sampleRateHz,
  };
};

assert.ok(projectManifest.experiments.some((entry: { experimentId: string; manifest: string }) => (
  entry.experimentId === 'piston-oscillation'
    && entry.manifest === 'audio/experiments/piston-oscillation/manifest.json'
)));
assert.equal(manifest.experimentId, 'piston-oscillation');
assert.equal(manifest.sources.length, 5);

const sourceById = new Map(manifest.sources.map((source) => [source.assetId, source]));
assert.deepEqual(
  [...sourceById.keys()].sort(),
  [
    'freesound.150501',
    'freesound.452640',
    'freesound.543637',
    'freesound.828779',
    'freesound.840868',
  ],
);
for (const source of manifest.sources) {
  assert.equal(source.license, 'CC0-1.0');
  assert.equal(source.licenseUrl, 'https://creativecommons.org/publicdomain/zero/1.0/');
  assert.match(source.sourceUrl, /^https:\/\/freesound\.org\//);
  assert.match(source.sourceSha256, /^[A-F0-9]{64}$/);
}

const referencedSourceIds = new Set(
  manifest.assets
    .map((asset) => asset.sourceAssetId)
    .filter((sourceId): sourceId is string => sourceId !== null),
);
assert.deepEqual(
  [...sourceById.keys()].sort(),
  [...referencedSourceIds].sort(),
  'the piston manifest should not retain sources unused by production audio',
);

const runtimeFiles = readdirSync(runtimeRoot).filter((name) => name.endsWith('.wav')).sort();
const pistonCatalogEntries = Object.entries(audioCatalog).filter(([assetId]) => (
  assetId.startsWith('pistonOscillation.')
));
const catalogFiles = pistonCatalogEntries.flatMap(([assetId, definition]) => {
  assert.equal(definition.id, assetId);
  assert.ok(definition.files.length > 0);
  assert.ok(Number.isFinite(definition.gain) && definition.gain >= 0);
  return definition.files.map((filePath) => filePath.split('/').at(-1) ?? '');
}).sort();
assert.deepEqual(catalogFiles, runtimeFiles);
assert.equal(audioCatalog['pistonOscillation.power.press'].files.length, 2);
assert.equal(audioCatalog['pistonOscillation.hose.connect'].files.length, 2);
assert.equal(audioCatalog['pistonOscillation.hose.disconnect'].files.length, 2);
assert.equal(audioCatalog['pistonOscillation.lockingScrew.turn'].files.length, 3);

const derivedAssets = manifest.assets.filter((asset) => asset.kind === 'third-party-derived');
assert.equal(derivedAssets.length, runtimeFiles.length);
assert.equal(manifest.assets.some((asset) => asset.kind === 'first-party-procedural'), false);
assert.deepEqual(
  [...new Set(derivedAssets.map((asset) => asset.audioId))].sort(),
  pistonCatalogEntries.map(([assetId]) => assetId).sort(),
);
for (const asset of derivedAssets) {
  assert.ok(asset.finalFileName);
  const filePath = join(runtimeRoot, asset.finalFileName);
  assert.ok(existsSync(filePath), `${asset.finalFileName} should exist`);
  assert.ok(sourceById.has(asset.sourceAssetId ?? ''));
  const fileBuffer = readFileSync(filePath);
  const hash = createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();
  assert.equal(hash, asset.outputSha256, `${asset.finalFileName} hash should match`);
  const wav = readPcmWavMetadata(fileBuffer);
  assert.equal(wav.audioFormat, 1);
  assert.equal(wav.sampleRateHz, 48000);
  assert.equal(wav.channels, 1);
  assert.equal(wav.bitsPerSample, 16);
  assert.ok(Math.abs(wav.durationS - (asset.durationS ?? 0)) < 0.000002);
}

const impactAsset = manifest.assets.find((asset) => (
  asset.audioId === 'pistonOscillation.piston.bottomImpact'
));
assert.ok(impactAsset);
assert.match(impactAsset.edit, /Runtime gain is derived from the uninterrupted unsupported drop distance/);

console.log('pistonOscillationAudioManifest tests passed');
