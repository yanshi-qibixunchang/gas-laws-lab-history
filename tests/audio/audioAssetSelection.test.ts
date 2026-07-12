import assert from 'node:assert/strict';
import { AudioEngine } from '../../src/audio/core/audioEngine.ts';
import type { AudioAssetDefinition } from '../../src/audio/core/audioTypes.ts';

const repeatingDefinition: AudioAssetDefinition = {
  id: 'test.repeating',
  files: ['a.wav', 'b.wav', 'c.wav'],
  bus: 'experiment',
  gain: 1,
};
const nonRepeatingDefinition: AudioAssetDefinition = {
  ...repeatingDefinition,
  id: 'test.nonRepeating',
  avoidImmediateRepeat: true,
};
const engine = new AudioEngine({
  'test.repeating': repeatingDefinition,
  'test.nonRepeating': nonRepeatingDefinition,
}, { enabled: true, volume: 1 });
const selector = engine as unknown as {
  selectFile: (assetId: string, definition: AudioAssetDefinition) => string | undefined;
};
const originalRandom = Math.random;

try {
  Math.random = () => 0;
  assert.equal(selector.selectFile('test.repeating', repeatingDefinition), 'a.wav');
  assert.equal(selector.selectFile('test.repeating', repeatingDefinition), 'a.wav');
  assert.equal(selector.selectFile('test.nonRepeating', nonRepeatingDefinition), 'a.wav');
  assert.equal(selector.selectFile('test.nonRepeating', nonRepeatingDefinition), 'b.wav');
  assert.equal(selector.selectFile('test.nonRepeating', nonRepeatingDefinition), 'a.wav');
} finally {
  Math.random = originalRandom;
}

console.log('audioAssetSelection tests passed');
