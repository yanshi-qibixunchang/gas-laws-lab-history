const runtimeUseWorkbenchPistonDemoRuntimeSource = readPistonRuntimeSource(new URL('../../src/features/workbench/useWorkbenchPistonDemoRuntime.ts', import.meta.url), 'utf8');
import { readFileSync as readPistonRuntimeSource } from 'node:fs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createPistonOscillationDemoPlaybackChannel,
  PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT,
} from '../../src/features/pistonOscillation/pistonOscillationDemoPlaybackChannel.ts';

const channel = createPistonOscillationDemoPlaybackChannel();
assert.equal(channel.getSnapshot(), PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT);

let notificationCount = 0;
const unsubscribe = channel.subscribe(() => {
  notificationCount += 1;
});
const runningSnapshot = { fileId: 'piston-1', phase: 'running' as const, elapsedMs: 50 };
channel.publish(runningSnapshot);
assert.equal(channel.getSnapshot(), runningSnapshot);
assert.equal(notificationCount, 1);
channel.publish({ ...runningSnapshot });
assert.equal(notificationCount, 1, 'an unchanged clock snapshot must not notify subscribers');
channel.publish({ ...runningSnapshot, elapsedMs: 100 });
assert.equal(notificationCount, 2);
unsubscribe();
channel.publish({ ...runningSnapshot, elapsedMs: 150 });
assert.equal(notificationCount, 2);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);
const instrumentSceneSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationInstrumentScene.tsx'),
  'utf8',
);
const acquisitionSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'pistonOscillation', 'PistonOscillationAcquisitionPanel.tsx'),
  'utf8',
);

assert.match(
  runtimeUseWorkbenchPistonDemoRuntimeSource,
  /window\.setInterval\(\(\) => \{[\s\S]*pistonOscillationDemoPlaybackChannel\.publish\([\s\S]*if \(!completed\) return;[\s\S]*setPistonOscillationDemoPlayback/,
  'the high-frequency Demo tick must avoid Workbench state updates until playback completes',
);
for (const source of [instrumentSceneSource, acquisitionSource]) {
  assert.match(source, /useSyncExternalStore\([\s\S]*demoPlaybackChannel\?\.subscribe/);
  assert.match(source, /getPistonOscillationDemoFrame\(demoPlaybackSnapshot\.elapsedMs, language\)/);
}

console.log('pistonOscillationDemoPlaybackChannel tests passed');

assert.match(workbenchSource, /useWorkbenchPistonController\(/, 'the root must keep the singleton piston controller connected');
