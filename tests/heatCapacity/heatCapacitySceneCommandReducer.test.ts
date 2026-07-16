import assert from 'node:assert/strict';
import {
  createHeatCapacitySceneCommandState,
  reduceHeatCapacitySceneCommand,
} from '../../src/features/heatCapacity/heatCapacitySceneCommandReducer.ts';

let state = createHeatCapacitySceneCommandState();
state = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'interaction',
    commandId: 'interaction:1',
    focusMode: 'pump',
  },
});
assert.equal(state.focusMode, 'pump');
assert.equal(state.viewRevision, 1);

state = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'script',
    commandId: 'script:1',
    focusMode: 'instrument',
  },
});
assert.equal(state.focusMode, 'instrument');
assert.equal(state.viewRevision, 2);

state = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'exact-mode-restore',
    commandId: 'restore:7',
    requestId: 7,
    focusMode: 'bottle',
    checkpoint: {
      cameraPose: null,
      ultraVisualState: null,
      hardSphereVisualCheckpoint: null,
    },
  },
});
assert.equal(state.focusMode, 'bottle');
assert.equal(state.viewRevision, 2, 'exact pose restore must not enqueue a viewpoint reset');
assert.deepEqual(state.exactRestoreCheckpoint, {
  cameraPose: null,
  ultraVisualState: null,
  hardSphereVisualCheckpoint: null,
}, 'the accepted exact command should own the complete scene checkpoint');

const blockedByExactRestore = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'user-reset',
    commandId: 'reset:1',
    focusMode: 'none',
  },
});
assert.equal(blockedByExactRestore, state);

state = reduceHeatCapacitySceneCommand(state, { type: 'release-exact-restore', requestId: 7 });
state = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'user-reset',
    commandId: 'reset:2',
    focusMode: 'none',
  },
});
assert.equal(state.focusMode, 'none');
assert.equal(state.viewRevision, 3);

const blockedLowerPriority = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'script',
    commandId: 'script:2',
    focusMode: 'instrument',
  },
});
assert.equal(blockedLowerPriority, state);

state = reduceHeatCapacitySceneCommand(state, { type: 'settled', commandId: 'reset:2' });
state = reduceHeatCapacitySceneCommand(state, {
  type: 'submit',
  command: {
    kind: 'script',
    commandId: 'script:3',
    focusMode: 'instrument',
  },
});
assert.equal(state.focusMode, 'instrument');

console.log('heatCapacitySceneCommandReducer tests passed');
