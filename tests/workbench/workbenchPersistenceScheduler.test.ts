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
    if (attempts === 1) {
      const error = new Error('quota');
      error.name = 'QuotaExceededError';
      throw error;
    }
  },
  onStatus: (status) => retryStatuses.push(status.state),
  debounceMs: 10,
  maxWaitMs: 30,
  retryDelaysMs: [10, 20, 30],
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

let nowMs = 1_000;
const checkpointSaves: number[] = [];
const checkpointScheduler = createWorkbenchPersistenceScheduler<number>({
  save: async (value) => { checkpointSaves.push(value); },
  debounceMs: 60_000,
  maxWaitMs: 60_000,
  runtimeCheckpointIntervalMs: 15_000,
  now: () => nowMs,
});
assert.equal(
  checkpointScheduler.schedule(() => 1, 'runtime-checkpoint'),
  true,
);
nowMs += 100;
assert.equal(
  checkpointScheduler.schedule(() => 2, 'runtime-checkpoint'),
  false,
  '100 ms realtime ticks must not continuously replace the accepted checkpoint',
);
checkpointScheduler.schedule(() => 3, 'semantic');
assert.equal(await checkpointScheduler.flush(), true);
assert.deepEqual(
  checkpointSaves,
  [3],
  'a semantic action should supersede a pending runtime checkpoint',
);
nowMs += 15_000;
assert.equal(
  checkpointScheduler.schedule(() => 4, 'runtime-checkpoint'),
  true,
);
checkpointScheduler.schedule(() => 5, 'lifecycle');
await new Promise<void>((resolve) => setImmediate(resolve));
assert.deepEqual(
  checkpointSaves,
  [3, 5],
  'a lifecycle request should flush the latest snapshot immediately',
);
checkpointScheduler.dispose();

let exhaustedAttempts = 0;
const exhaustedScheduler = createWorkbenchPersistenceScheduler<number>({
  save: async () => {
    exhaustedAttempts += 1;
    const error = new Error('temporary transaction conflict');
    error.name = 'AbortError';
    throw error;
  },
  debounceMs: 0,
  maxWaitMs: 0,
  retryDelaysMs: [5, 5, 5],
});
exhaustedScheduler.schedule(() => 6);
for (let poll = 0; poll < 50 && exhaustedAttempts < 4; poll += 1) {
  await delay(10);
}
assert.equal(
  exhaustedAttempts,
  4,
  'a temporary transaction error should receive the initial attempt plus all three bounded retries',
);
assert.equal(exhaustedScheduler.getStatus().state, 'failed');
exhaustedScheduler.dispose();

let structuralAttempts = 0;
const structuralScheduler = createWorkbenchPersistenceScheduler<number>({
  save: async () => {
    structuralAttempts += 1;
    throw new Error('workspace file schema is invalid');
  },
  debounceMs: 0,
  maxWaitMs: 0,
  retryDelaysMs: [0, 0, 0],
});
structuralScheduler.schedule(() => 7);
await delay(10);
assert.equal(
  structuralAttempts,
  1,
  'a structural file error must fail once without a transaction retry loop',
);
assert.equal(structuralScheduler.getStatus().state, 'failed');
structuralScheduler.dispose();

console.log('workbenchPersistenceScheduler tests passed');
