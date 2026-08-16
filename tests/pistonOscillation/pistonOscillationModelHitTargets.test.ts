import assert from 'node:assert/strict';
import {
  PISTON_MODEL_HIT_TARGETS,
  createPistonModelHitTargetMetadata,
} from '../../src/features/pistonOscillation/pistonOscillationModelHitTargets.ts';

assert.deepEqual(Object.keys(PISTON_MODEL_HIT_TARGETS), [
  'pistonPressPlatform',
  'pistonLockingScrew',
  'connectedHoseConnector',
  'connectedHoseBody',
  'detachedHoseConnector',
  'detachedHoseBody',
]);

const objectNames = Object.values(PISTON_MODEL_HIT_TARGETS).map(({ objectName }) => objectName);
assert.equal(new Set(objectNames).size, objectNames.length, 'hit target object names must be unique');

assert.equal(
  PISTON_MODEL_HIT_TARGETS.pistonPressPlatform.sourceObjectName,
  'MassPlatform',
);
assert.equal(
  PISTON_MODEL_HIT_TARGETS.pistonLockingScrew.sourceObjectName,
  'PistonLockingScrew_KnurledKnob_Preview',
);
assert.equal(
  PISTON_MODEL_HIT_TARGETS.connectedHoseConnector.semanticRole,
  'disconnect_hose',
);
assert.equal(
  PISTON_MODEL_HIT_TARGETS.detachedHoseConnector.semanticRole,
  'reconnect_hose',
);
assert.equal(
  PISTON_MODEL_HIT_TARGETS.connectedHoseBody.semanticRole,
  PISTON_MODEL_HIT_TARGETS.connectedHoseConnector.semanticRole,
);
assert.equal(
  PISTON_MODEL_HIT_TARGETS.detachedHoseBody.semanticRole,
  PISTON_MODEL_HIT_TARGETS.detachedHoseConnector.semanticRole,
);

for (const key of Object.keys(PISTON_MODEL_HIT_TARGETS) as Array<keyof typeof PISTON_MODEL_HIT_TARGETS>) {
  assert.deepEqual(createPistonModelHitTargetMetadata(key), {
    hitTargetId: PISTON_MODEL_HIT_TARGETS[key].id,
    semanticRole: PISTON_MODEL_HIT_TARGETS[key].semanticRole,
    focusPolicy: 'deferred',
    interactionEnabled: false,
  });
}

console.log('pistonOscillationModelHitTargets tests passed');
