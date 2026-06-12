import assert from 'node:assert/strict';
import {
  createHeatCapacityHardSphereBoxContainer,
  createHeatCapacityHardSphereCylinderContainer,
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

const cylinderContainer = createHeatCapacityHardSphereCylinderContainer({
  radius: 0.485,
  halfHeight: 0.6325,
  outletPoint: { x: 0, y: 0.6157, z: 0 },
  outletDirection: { x: 0, y: 1, z: 0 },
  pumpPortPoint: { x: 0.32, y: -0.08, z: 0.33 },
});

for (let index = 0; index < 128; index += 1) {
  const position = sampleHeatCapacityHardSpherePosition(cylinderContainer, radius, index * 19 + 5);
  assert.equal(isHeatCapacityHardSphereInsideContainer(cylinderContainer, position, radius), true);
  assert.equal(Math.hypot(position.x, position.z) <= cylinderContainer.radius - radius + 0.000001, true);
}

const sideWallParticle: HeatCapacityHardSphereParticle = {
  id: 3,
  position: { x: 0.52, y: 0.02, z: 0.19 },
  velocity: { x: 0.48, y: 0.01, z: 0.2 },
  state: 'inside',
  outflowProgress: 0,
};
resolveHeatCapacityHardSphereWallBounce(cylinderContainer, sideWallParticle, radius);
assert.equal(isHeatCapacityHardSphereInsideContainer(cylinderContainer, sideWallParticle.position, radius), true);
assert.equal(
  (sideWallParticle.position.x * sideWallParticle.velocity.x) +
    (sideWallParticle.position.z * sideWallParticle.velocity.z) <= 0,
  true,
  'cylinder side-wall bounce should reflect the outward radial velocity component',
);

const capParticle: HeatCapacityHardSphereParticle = {
  id: 4,
  position: { x: 0.08, y: 0.72, z: -0.05 },
  velocity: { x: 0.02, y: 0.31, z: -0.01 },
  state: 'inside',
  outflowProgress: 0,
};
resolveHeatCapacityHardSphereWallBounce(cylinderContainer, capParticle, radius);
assert.equal(isHeatCapacityHardSphereInsideContainer(cylinderContainer, capParticle.position, radius), true);
assert.equal(capParticle.velocity.y < 0, true);
