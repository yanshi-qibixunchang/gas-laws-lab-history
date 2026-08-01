import assert from 'node:assert/strict';
import {
  MANDATORY_CONSENT_READING_MS,
  accumulateVisibleReadingTime,
  getMandatoryConsentRemainingSeconds,
  isMandatoryConsentReady,
  isMandatoryConsentScrollComplete,
} from '../../src/features/onboarding/mandatoryConsentModel.ts';

assert.equal(accumulateVisibleReadingTime({
  elapsedMs: 2_000,
  intervalStartMs: 100,
  intervalEndMs: 1_100,
  visible: true,
}), 3_000);
assert.equal(accumulateVisibleReadingTime({
  elapsedMs: 2_000,
  intervalStartMs: 100,
  intervalEndMs: 9_100,
  visible: false,
}), 2_000);
assert.equal(accumulateVisibleReadingTime({
  elapsedMs: 14_900,
  intervalStartMs: 100,
  intervalEndMs: 1_100,
  visible: true,
}), MANDATORY_CONSENT_READING_MS);

assert.equal(isMandatoryConsentScrollComplete({
  scrollTop: 598,
  clientHeight: 400,
  scrollHeight: 1_000,
}), true);
assert.equal(isMandatoryConsentScrollComplete({
  scrollTop: 590,
  clientHeight: 400,
  scrollHeight: 1_000,
}), false);
assert.equal(isMandatoryConsentReady({
  elapsedVisibleMs: 15_000,
  scrolledToBottom: false,
}), false);
assert.equal(isMandatoryConsentReady({
  elapsedVisibleMs: 14_999,
  scrolledToBottom: true,
}), false);
assert.equal(isMandatoryConsentReady({
  elapsedVisibleMs: 15_000,
  scrolledToBottom: true,
}), true);
assert.equal(getMandatoryConsentRemainingSeconds(1), 15);
assert.equal(getMandatoryConsentRemainingSeconds(14_001), 1);
assert.equal(getMandatoryConsentRemainingSeconds(15_000), 0);

console.log('mandatoryConsentModel tests passed');
