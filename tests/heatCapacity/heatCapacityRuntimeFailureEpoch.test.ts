import assert from 'node:assert/strict';
import {
  reportHeatCapacityRuntimeFailure,
  runHeatCapacityRuntimeGuarded,
} from '../../src/features/heatCapacity/heatCapacityRuntimeGuard.ts';

const stateRef = { current: { revision: 1, failed: false } };
const errors: unknown[] = [];
const report = (error: unknown, sourceRevision: number) => {
  reportHeatCapacityRuntimeFailure(stateRef, sourceRevision, (reported) => errors.push(reported), error);
};
let laterFrameSubscriptions = 0;
const injectedError = new Error('injected inner frame failure');

runHeatCapacityRuntimeGuarded(stateRef, 1, report, () => {
  report(injectedError, 1);
});
runHeatCapacityRuntimeGuarded(stateRef, 1, report, () => {
  laterFrameSubscriptions += 1;
});

assert.equal(stateRef.current.failed, true);
assert.deepEqual(errors, [injectedError]);
assert.equal(
  laterFrameSubscriptions,
  0,
  'an inner catch that reports a failure must stop later guarded subscriptions in the same frame',
);

stateRef.current = { revision: 2, failed: false };
report(new Error('stale revision'), 1);
assert.equal(stateRef.current.failed, false, 'a stale callback must not poison a remounted runtime epoch');
const currentError = new Error('current revision');
report(currentError, 2);
assert.equal(stateRef.current.failed, true);
assert.equal(errors.at(-1), currentError);

console.log('heatCapacityRuntimeFailureEpoch tests passed');
