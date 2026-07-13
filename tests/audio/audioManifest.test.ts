import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { audioCatalog } from '../../src/audio/catalog/audioCatalog.ts';
import type { ExperimentAudioManifest } from '../../src/audio/catalog/audioManifestTypes.ts';

const projectRoot = process.cwd();
const audioRoot = join(projectRoot, 'public', 'audio');
const runtimeRoot = join(audioRoot, 'experiments', 'heat-capacity');
const projectManifest = JSON.parse(readFileSync(join(audioRoot, 'manifest.json'), 'utf8'));
const manifest = JSON.parse(
  readFileSync(join(runtimeRoot, 'manifest.json'), 'utf8'),
) as ExperimentAudioManifest;

const readPcmWavMetadata = (buffer: Buffer) => {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
  let offset = 12;
  let format: { audioFormat: number; channels: number; sampleRateHz: number; bitsPerSample: number } | null = null;
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

assert.equal(projectManifest.schemaVersion, 1);
assert.equal('common' in projectManifest, false, 'the root manifest should not retain an empty common-audio registry');
assert.equal(existsSync(join(audioRoot, 'common', 'manifest.json')), false);
assert.ok(projectManifest.experiments.some((entry: { experimentId: string; manifest: string }) => (
  entry.experimentId === 'heat-capacity' && entry.manifest === 'audio/experiments/heat-capacity/manifest.json'
)));
assert.equal(manifest.experimentId, 'heat-capacity');
assert.equal(manifest.sources.length, 5);

const sourceById = new Map(manifest.sources.map((source: { assetId: string }) => [source.assetId, source]));
assert.equal(sourceById.has('freesound.402462'), false, 'the retired pump-valve source should not remain in production metadata');
assert.equal(sourceById.has('freesound.650353'), true, 'the writing source should be registered');
assert.equal(sourceById.has('freesound.808874'), true, 'the replacement pump-valve source should be registered');
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
  'the source manifest should not retain materials that no production asset uses',
);

const runtimeFiles = readdirSync(runtimeRoot).filter((name) => name.endsWith('.wav')).sort();
const catalogFiles = Object.entries(audioCatalog).flatMap(([assetId, definition]) => {
  assert.equal(definition.id, assetId, `${assetId} should agree with its catalog key`);
  assert.ok(definition.files.length > 0, `${assetId} should provide at least one production file`);
  assert.ok(Number.isFinite(definition.gain) && definition.gain >= 0, `${assetId} should have a valid gain`);
  return definition.files.map((filePath) => filePath.split('/').at(-1) ?? '');
}).sort();
assert.deepEqual(catalogFiles, runtimeFiles, 'every production WAV should be referenced by the runtime catalog');
assert.equal(
  audioCatalog['heatCapacity.pumpValve.open'].files.length,
  audioCatalog['heatCapacity.pumpValve.close'].files.length,
  'paired pump-valve directions should expose the same number of timbre variants',
);

const derivedAssets = manifest.assets.filter((asset: { kind: string }) => asset.kind === 'third-party-derived');
assert.equal(derivedAssets.length, runtimeFiles.length);
assert.deepEqual(
  [...new Set(derivedAssets.map((asset) => asset.audioId))].sort(),
  Object.keys(audioCatalog).sort(),
  'the runtime catalog and audited third-party asset IDs should have the same ownership boundary',
);
for (const asset of derivedAssets) {
  assert.ok(asset.finalFileName);
  const filePath = join(runtimeRoot, asset.finalFileName);
  assert.ok(existsSync(filePath), `${asset.finalFileName} should exist`);
  assert.ok(sourceById.has(asset.sourceAssetId), `${asset.finalFileName} should reference an approved source`);
  const fileBuffer = readFileSync(filePath);
  const hash = createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();
  assert.equal(hash, asset.outputSha256, `${asset.finalFileName} hash should match the audited manifest`);
  const wav = readPcmWavMetadata(fileBuffer);
  assert.equal(wav.audioFormat, 1, `${asset.finalFileName} should be uncompressed PCM`);
  assert.equal(wav.sampleRateHz, 48000);
  assert.equal(wav.channels, 1);
  assert.equal(wav.bitsPerSample, 16);
  assert.ok(Math.abs(wav.durationS - asset.durationS) < 0.000002, `${asset.finalFileName} duration should match manifest`);
}

const proceduralAssets = manifest.assets.filter((asset: { kind: string }) => asset.kind === 'first-party-procedural');
assert.deepEqual(proceduralAssets.map((asset: { audioId: string }) => asset.audioId), ['heatCapacity.release.flow']);
assert.equal(proceduralAssets[0].sourceAssetId, null);
assert.equal(proceduralAssets[0].finalFileName, null);
assert.equal(proceduralAssets[0].outputSha256, null);

console.log('audioManifest tests passed');
