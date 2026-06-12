import assert from 'node:assert/strict';
import {
  stepHeatCapacityHardSphereKineticSpeed,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereKineticSpeed.ts';

const coolDuringRelease = stepHeatCapacityHardSphereKineticSpeed({
  currentSpeed: 1.5,
  targetSpeed: 0.68,
  releaseMemoryRemainingS: 1.45,
  releaseActive: false,
  dtS: 1 / 60,
});

assert.equal(
  coolDuringRelease.speed > 1.45,
  true,
  'recent release cooling should not hard-cut the molecule motion speed in one frame',
);
assert.equal(
  coolDuringRelease.releaseMemoryRemainingS < 1.45 && coolDuringRelease.releaseMemoryRemainingS > 1.42,
  true,
  'release kinetic memory should decay with frame time when release is no longer active',
);

let releaseDecayState = {
  speed: 1.5,
  releaseMemoryRemainingS: 1.45,
};
for (let step = 0; step < 72; step += 1) {
  releaseDecayState = stepHeatCapacityHardSphereKineticSpeed({
    currentSpeed: releaseDecayState.speed,
    targetSpeed: 0.68,
    releaseMemoryRemainingS: releaseDecayState.releaseMemoryRemainingS,
    releaseActive: false,
    dtS: 1 / 60,
  });
}

assert.equal(
  releaseDecayState.speed > 1.02 && releaseDecayState.speed < 1.16,
  true,
  'release speed memory should still preserve visible molecular motion after about one second',
);
assert.equal(
  releaseDecayState.releaseMemoryRemainingS > 0.2 && releaseDecayState.releaseMemoryRemainingS < 0.3,
  true,
  'release kinetic memory should last long enough to cover the visible post-release slowdown',
);

for (let step = 0; step < 72; step += 1) {
  releaseDecayState = stepHeatCapacityHardSphereKineticSpeed({
    currentSpeed: releaseDecayState.speed,
    targetSpeed: 0.68,
    releaseMemoryRemainingS: releaseDecayState.releaseMemoryRemainingS,
    releaseActive: false,
    dtS: 1 / 60,
  });
}

assert.equal(
  releaseDecayState.speed < 0.8 && releaseDecayState.speed > 0.68,
  true,
  'release speed memory should still settle near the cooled target after the visual inertia window',
);
assert.equal(
  releaseDecayState.releaseMemoryRemainingS,
  0,
  'release kinetic memory should fully expire after the extended visual inertia window',
);

const ordinaryCooldown = stepHeatCapacityHardSphereKineticSpeed({
  currentSpeed: 1.5,
  targetSpeed: 0.68,
  releaseMemoryRemainingS: 0,
  releaseActive: false,
  dtS: 0.2,
});
const releaseCooldown = stepHeatCapacityHardSphereKineticSpeed({
  currentSpeed: 1.5,
  targetSpeed: 0.68,
  releaseMemoryRemainingS: 1.45,
  releaseActive: false,
  dtS: 0.2,
});

assert.equal(
  releaseCooldown.speed > ordinaryCooldown.speed + 0.18,
  true,
  'recent release cooling should preserve more kinetic speed than ordinary cooling',
);

const warmup = stepHeatCapacityHardSphereKineticSpeed({
  currentSpeed: 0.68,
  targetSpeed: 1.5,
  releaseMemoryRemainingS: 0,
  releaseActive: false,
  dtS: 0.22,
});

assert.equal(
  warmup.speed > 1.1,
  true,
  'speed increases should remain responsive instead of using the slow cooling memory',
);
