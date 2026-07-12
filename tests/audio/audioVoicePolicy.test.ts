import assert from 'node:assert/strict';
import { AudioVoiceRateLimiter } from '../../src/audio/core/audioVoicePolicy.ts';

const limiter = new AudioVoiceRateLimiter(() => 0);
assert.equal(limiter.accept('knob', 50, 100), true);
assert.equal(limiter.accept('knob', 50, 149.999), false, 'over-limit sounds should be dropped, not queued');
assert.equal(limiter.accept('knob', 50, 150), true);
assert.equal(limiter.accept('pump', 250, 150), true, 'different voice groups should be independent');
assert.equal(limiter.accept('pump', 250, 399), false);
assert.equal(limiter.accept('pump', 250, 400), true);
limiter.reset('pump');
assert.equal(limiter.accept('pump', 250, 401), true);
limiter.reset();
assert.equal(limiter.accept('knob', 50, 151), true);

console.log('audioVoicePolicy tests passed');
