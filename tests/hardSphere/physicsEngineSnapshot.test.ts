import assert from 'node:assert/strict';
import {
  PHYSICS_ENGINE_SNAPSHOT_VERSION,
  PhysicsEngine,
} from '../../src/domain/hardSphere/PhysicsEngine.ts';

const params = {
  N: 32,
  r: 0.15,
  L: 8,
  m: 1,
  k: 1,
  dt: 0.02,
  nu: 0.4,
  equilibriumTime: 0.2,
  statsDuration: 0.4,
  targetTemperature: 1.2,
};

const engine = new PhysicsEngine(params);
for (let index = 0; index < 40; index += 1) {
  engine.step();
  if (engine.time >= params.equilibriumTime) engine.collectSamples();
}
engine.flushPressureMeasurement();

const snapshot = engine.createSnapshot();
assert.equal(snapshot.schemaVersion, PHYSICS_ENGINE_SNAPSHOT_VERSION);
assert.equal(snapshot.params.N, params.N);
assert.equal(snapshot.particles.length, params.N);
assert.ok(snapshot.time > 0);
assert.ok(snapshot.collectedSampleWindowTotal > 0);
assert.ok(snapshot.pressureHistory.length > 0);

const restored = PhysicsEngine.fromSnapshot(snapshot);
assert.equal(restored.time, snapshot.time);
assert.equal(restored.targetTemperature, snapshot.targetTemperature);
assert.equal(restored.particles.length, snapshot.particles.length);
assert.equal(restored.getCollectedSampleCount(), snapshot.collectedSampleWindowTotal);
assert.deepEqual(restored.getPressureMeasurementSummary(), engine.getPressureMeasurementSummary());
assert.deepEqual(restored.getStats(), engine.getStats());

restored.step();
assert.ok(restored.time > snapshot.time, 'restored engine should continue from the snapshot time');

console.log('physicsEngineSnapshot tests passed');
