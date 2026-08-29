import assert from 'node:assert/strict';
import {
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationVirtualHandThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG,
  PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION,
  getPistonOscillationVirtualHandTargetDisplacementMm,
  scalePistonOscillationVirtualHandDragToReferencePx,
} from '../../src/domain/pistonOscillation/pistonOscillationVirtualHandModel.ts';

const config = DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG;
assert.equal(config.modelVersion, PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION);
assert.equal(config.normalDragReferencePx, 200);
assert.equal(config.limitDragReferencePx, 350);
assert.equal(config.handStiffnessNPerM, 5_000);
assert.equal(getPistonOscillationVirtualHandTargetDisplacementMm(0), 0);
assert.equal(
  getPistonOscillationVirtualHandTargetDisplacementMm(200),
  config.normalTargetDisplacementMm,
);
assert.equal(
  getPistonOscillationVirtualHandTargetDisplacementMm(350),
  config.limitTargetDisplacementMm,
);
assert.equal(
  scalePistonOscillationVirtualHandDragToReferencePx(200, 438),
  200,
);
assert.equal(
  scalePistonOscillationVirtualHandDragToReferencePx(400, 876),
  200,
  'doubling the 3D scene height must double the physical mouse travel for the same hand target',
);

let previousTargetMm = 0;
for (let referenceDragPx = 0; referenceDragPx <= 2_000; referenceDragPx += 1) {
  const targetMm = getPistonOscillationVirtualHandTargetDisplacementMm(
    referenceDragPx,
  );
  assert.ok(targetMm >= previousTargetMm, 'the virtual-hand curve must be monotonic');
  assert.ok(targetMm < config.asymptoticTargetDisplacementMm);
  previousTargetMm = targetMm;
}
assert.ok(
  getPistonOscillationVirtualHandTargetDisplacementMm(550) -
    getPistonOscillationVirtualHandTargetDisplacementMm(350) < 0.7,
  'another 200 reference pixels beyond the practical limit must add less than 0.7 mm of hand target',
);

const advanceRamp = (
  lockedHeightMm: number,
  startReferenceDragPx: number,
  endReferenceDragPx: number,
  durationS: number,
  initialState = getPistonOscillationSettlingStateAtProgress(lockedHeightMm, 1),
) => {
  const equilibriumHeightMm = getPistonOscillationSettlingStateAtProgress(
    lockedHeightMm,
    1,
  ).pistonHeightM * 1_000;
  const intervalCount = Math.round(durationS * 1_000);
  let state = initialState;
  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    const progress = intervalIndex / intervalCount;
    const referenceDragPx = startReferenceDragPx
      + (endReferenceDragPx - startReferenceDragPx) * progress;
    state = advancePistonOscillationVirtualHandThermodynamicState({
      referenceState: state,
      equilibriumHeightMm,
      targetDownwardDisplacementMm:
        getPistonOscillationVirtualHandTargetDisplacementMm(referenceDragPx),
      elapsedS: 0.001,
    });
  }
  return { state, equilibriumHeightMm };
};

    const expectedNormalPressureWindowsKpa = new Map<
      number,
      readonly [number, number]
    >([
  [80, [120, 121.5]],
  [70, [122, 124]],
  [60, [124.5, 126.5]],
] as const);
for (const lockedHeightMm of [80, 70, 60]) {
  const normal = advanceRamp(lockedHeightMm, 0, 200, 1);
  const normalPressureKpa = normal.state.pressurePa / 1_000;
  const [minimumKpa, maximumKpa] = expectedNormalPressureWindowsKpa.get(
    lockedHeightMm,
  )!;
  assert.ok(
    normalPressureKpa >= minimumKpa && normalPressureKpa <= maximumKpa,
    `${lockedHeightMm} mm normal press should retain the reviewed pressure anchor`,
  );
  const normalDownwardDisplacementMm = normal.equilibriumHeightMm
    - normal.state.pistonHeightM * 1_000;
  assert.ok(normalDownwardDisplacementMm > 12);

  const limit = advanceRamp(
    lockedHeightMm,
    200,
    350,
    1,
    normal.state,
  );
  assert.ok(limit.state.pressurePa > normal.state.pressurePa);
  assert.ok(limit.state.pistonHeightM < normal.state.pistonHeightM);
  assert.ok(limit.state.pressurePa < 150_000);
  if (lockedHeightMm === 80) {
    const releaseDisplacementMm = limit.state.pistonHeightM * 1_000
      - limit.equilibriumHeightMm;
    assert.ok(releaseDisplacementMm < -12);
    const release = simulatePistonOscillationThermalRelease({
      lockedHeightMm,
      initialDisplacementMm: releaseDisplacementMm,
      initialVelocityMmPerS: limit.state.velocityMPerS * 1_000,
      referenceThermodynamicState: limit.state,
    }, { trajectoryDurationS: 0.1 });
    assert.ok(Math.abs(release.initialDisplacementM * 1_000
      - releaseDisplacementMm) < 1e-10);
  }
}

const rapid = advanceRamp(80, 0, 200, 0.1);
const rapidPressurePa = rapid.state.pressurePa;
const rapidHeightM = rapid.state.pistonHeightM;
let heldState = rapid.state;
for (let intervalIndex = 0; intervalIndex < 250; intervalIndex += 1) {
  heldState = advancePistonOscillationVirtualHandThermodynamicState({
    referenceState: heldState,
    equilibriumHeightMm: rapid.equilibriumHeightMm,
    targetDownwardDisplacementMm:
      getPistonOscillationVirtualHandTargetDisplacementMm(200),
    elapsedS: 0.001,
  });
}
assert.ok(
  heldState.pressurePa < rapidPressurePa,
  'holding the compliant hand position must expose thermal pressure relaxation',
);
assert.ok(
  heldState.pistonHeightM < rapidHeightM,
  'the piston should creep slightly downward while the compressed gas cools against a compliant hand',
);

console.log('pistonOscillationVirtualHandModel tests passed');
