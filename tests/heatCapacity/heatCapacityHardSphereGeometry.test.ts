import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereBoxContainer,
  isHeatCapacityHardSphereInsideContainer,
  resolveHeatCapacityHardSphereWallBounce,
  sampleHeatCapacityHardSpherePosition,
  type HeatCapacityHardSphereParticle,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereGeometry.ts';

const container = createHeatCapacityHardSphereBoxContainer({
  halfSize: { x: 0.73, y: 0.73, z: 0.73 },
  outletPoint: { x: 0, y: 0.7132, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: -0.67, y: 0.28, z: 0.26 },
});
const radius = 0.048;

for (let index = 0; index < 128; index += 1) {
  const position = sampleHeatCapacityHardSpherePosition(container, radius, index * 17 + 3);
  assert.equal(isHeatCapacityHardSphereInsideContainer(container, position, radius), true);
}

const particle: HeatCapacityHardSphereParticle = {
  id: 1,
  position: { x: 0.9, y: 0, z: 0 },
  velocity: { x: 0.54, y: 0, z: 0 },
  state: 'inside',
  outflowProgress: 0,
};
resolveHeatCapacityHardSphereWallBounce(container, particle, radius);
assert.equal(particle.position.x <= 0.73 - radius, true);
assert.equal(particle.velocity.x < 0, true);

const inwardParticle: HeatCapacityHardSphereParticle = {
  id: 2,
  position: { x: -0.91, y: 0.92, z: -0.94 },
  velocity: { x: 0.2, y: -0.3, z: 0.4 },
  state: 'inside',
  outflowProgress: 0,
};
resolveHeatCapacityHardSphereWallBounce(container, inwardParticle, radius);
assert.equal(isHeatCapacityHardSphereInsideContainer(container, inwardParticle.position, radius), true);
assert.equal(inwardParticle.velocity.x > 0, true);
assert.equal(inwardParticle.velocity.y < 0, true);
assert.equal(inwardParticle.velocity.z > 0, true);
