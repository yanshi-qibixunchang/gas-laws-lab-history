import assert from 'node:assert/strict';
import { updateHeatCapacitySceneMotionSources } from '../../src/features/heatCapacity/heatCapacitySceneMotionSources.ts';

let sources = new Set<string>();

let update = updateHeatCapacitySceneMotionSources(sources, 'stopcock-state', true);
assert.equal(update.changed, true);
assert.equal(update.active, true);
sources = update.sources;

update = updateHeatCapacitySceneMotionSources(sources, 'stopcock-rollback', true);
assert.equal(update.active, true);
assert.deepEqual([...update.sources], ['stopcock-state', 'stopcock-rollback']);
sources = update.sources;

update = updateHeatCapacitySceneMotionSources(sources, 'stopcock-state', false);
assert.equal(update.active, true, 'one completed animation must not release another overlapping motion');
assert.deepEqual([...update.sources], ['stopcock-rollback']);
sources = update.sources;

update = updateHeatCapacitySceneMotionSources(sources, 'stopcock-rollback', false);
assert.equal(update.active, false, 'the scene should unlock only after the final real motion settles');
assert.equal(update.sources.size, 0);
sources = update.sources;

update = updateHeatCapacitySceneMotionSources(sources, 'pump-valve-state', false);
assert.equal(update.changed, false, 'duplicate inactive reports must be idempotent');
assert.equal(update.active, false);

update = updateHeatCapacitySceneMotionSources(sources, 'pump-bulb-rollback', true);
sources = update.sources;
update = updateHeatCapacitySceneMotionSources(sources, 'pump-bulb-rollback', true);
assert.equal(update.changed, false, 'a fast retrigger must not create a false inactive gap');
assert.equal(update.active, true);

update = updateHeatCapacitySceneMotionSources(update.sources, '   ', true);
assert.equal(update.changed, false, 'an empty motion id must never create a permanent blocker');
assert.deepEqual([...update.sources], ['pump-bulb-rollback']);

console.log('heatCapacitySceneMotionSources tests passed');
