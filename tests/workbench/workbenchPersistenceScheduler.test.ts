import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createWorkbenchPersistenceScheduler,
} from '../../src/features/workbench/workbenchPersistenceScheduler.ts';

const saved: number[] = [];
const statuses: string[] = [];
const scheduler = createWorkbenchPersistenceScheduler<number>({
  save: async (value) => { saved.push(value); },
  onStatus: (status) => statuses.push(status.state),
  debounceMs: 20,
  maxWaitMs: 45,
});
scheduler.schedule(() => 1);
scheduler.schedule(() => 2);
await delay(30);
assert.deepEqual(saved, [2], 'debounce should coalesce writes and retain the newest snapshot');
assert.ok(statuses.includes('pending'));
assert.ok(statuses.includes('saving'));
assert.equal(scheduler.getStatus().state, 'idle');
scheduler.dispose();

let attempts = 0;
const retryStatuses: string[] = [];
const retryingScheduler = createWorkbenchPersistenceScheduler<number>({
  save: async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('quota');
  },
  onStatus: (status) => retryStatuses.push(status.state),
  debounceMs: 10,
  maxWaitMs: 30,
});
retryingScheduler.schedule(() => 3);
await delay(35);
assert.equal(attempts, 2);
assert.ok(retryStatuses.includes('retrying'));
assert.equal(retryingScheduler.getStatus().state, 'idle');
retryingScheduler.dispose();

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};
const createDeferred = (): Deferred => {
  let resolvePromise: (() => void) | null = null;
  return {
    promise: new Promise<void>((resolve) => {
      resolvePromise = resolve;
    }),
    resolve: () => resolvePromise?.(),
  };
};
const firstSave = createDeferred();
const secondSave = createDeferred();
const drainCalls: number[] = [];
const drainStatuses: string[] = [];
const drainingScheduler = createWorkbenchPersistenceScheduler<number>({
  save: async (value) => {
    drainCalls.push(value);
    await (value === 1 ? firstSave.promise : secondSave.promise);
  },
  onStatus: (status) => drainStatuses.push(status.state),
  debounceMs: 60_000,
  maxWaitMs: 60_000,
});
drainingScheduler.schedule(() => 1);
const firstFlush = drainingScheduler.flush();
await Promise.resolve();
drainingScheduler.schedule(() => 2);
const secondFlush = drainingScheduler.flush();
let firstFlushResolved = false;
let secondFlushResolved = false;
void firstFlush.then(() => { firstFlushResolved = true; });
void secondFlush.then(() => { secondFlushResolved = true; });
firstSave.resolve();
await new Promise<void>((resolve) => setImmediate(resolve));
assert.deepEqual(drainCalls, [1, 2], 'the shared drain should start the newest pending save after the active save');
assert.deepEqual(
  drainStatuses,
  ['pending', 'saving', 'pending', 'pending', 'saving'],
  'an older verified save must keep the newer requested snapshot pending instead of publishing idle',
);
assert.equal(firstFlushResolved, false, 'the first flush must wait for the second save');
assert.equal(secondFlushResolved, false, 'a concurrent close flush must share the complete drain');
assert.equal(drainingScheduler.getStatus().state, 'saving');
secondSave.resolve();
assert.equal(await firstFlush, true);
assert.equal(await secondFlush, true);
assert.equal(drainingScheduler.getStatus().state, 'idle');
drainingScheduler.dispose();

console.log('workbenchPersistenceScheduler tests passed');
