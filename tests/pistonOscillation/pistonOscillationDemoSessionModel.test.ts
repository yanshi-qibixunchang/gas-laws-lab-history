import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION,
  completePistonOscillationDemoSession,
  createDefaultPistonOscillationDemoSession,
  normalizePistonOscillationDemoSession,
  pausePistonOscillationDemoSession,
  resolvePistonOscillationDemoSession,
  resumePistonOscillationDemoSession,
  startPistonOscillationDemoSession,
} from '../../src/domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';

const idle = createDefaultPistonOscillationDemoSession(100);
assert.deepEqual(idle, {
  schemaVersion: PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION,
  status: 'idle',
  elapsedMs: 0,
  runningSinceMs: null,
  updatedAtMs: 100,
});

const running = startPistonOscillationDemoSession(1_000);
assert.equal(running.status, 'running');
assert.equal(running.runningSinceMs, 1_000);

const refreshed = resolvePistonOscillationDemoSession(running, 10_000, 4_250);
assert.equal(refreshed.status, 'running');
assert.equal(refreshed.elapsedMs, 3_250);
assert.equal(refreshed.runningSinceMs, 1_000);

const paused = pausePistonOscillationDemoSession(running, 10_000, 4_250);
assert.equal(paused.status, 'paused');
assert.equal(paused.elapsedMs, 3_250);
assert.equal(paused.runningSinceMs, null);

const resumed = resumePistonOscillationDemoSession(paused, 8_000);
assert.equal(resumed.status, 'running');
assert.equal(resumed.elapsedMs, 3_250);
assert.equal(resumed.runningSinceMs, 8_000);

const completedAfterRefresh = resolvePistonOscillationDemoSession(
  resumed,
  10_000,
  15_000,
);
assert.equal(completedAfterRefresh.status, 'completed');
assert.equal(completedAfterRefresh.elapsedMs, 10_000);
assert.equal(completedAfterRefresh.runningSinceMs, null);

const completed = completePistonOscillationDemoSession(10_000, 20_000);
assert.equal(completed.status, 'completed');
assert.equal(completed.elapsedMs, 10_000);

assert.deepEqual(
  normalizePistonOscillationDemoSession({
    schemaVersion: 999,
    status: 'paused',
    elapsedMs: 500,
    runningSinceMs: 123,
    updatedAtMs: 600,
  }),
  {
    schemaVersion: PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION,
    status: 'paused',
    elapsedMs: 500,
    runningSinceMs: null,
    updatedAtMs: 600,
  },
);

console.log('pistonOscillationDemoSessionModel tests passed');
