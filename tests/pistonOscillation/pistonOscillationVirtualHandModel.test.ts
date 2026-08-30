import assert from 'node:assert/strict';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  getPistonOscillationSettlingStateAtProgress,
  type PistonOscillationPhysicsConfig,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  advancePistonOscillationVirtualHandThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  createPistonOscillationDynamicSensorObservationSeries,
  findPistonOscillationObservedFallingTriggerSample,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG,
  PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION,
  getPistonOscillationVirtualHandTargetDisplacementMm,
  scalePistonOscillationVirtualHandDragToReferencePx,
} from '../../src/domain/pistonOscillation/pistonOscillationVirtualHandModel.ts';

const config = DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG;
const currentPhysicsConfig = {
  linearDampingNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
};
const legacyPhysicsConfig = {
  linearDampingNsPerM: PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M,
};
assert.equal(config.modelVersion, PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION);
assert.equal(PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION, 'piston-oscillation-virtual-hand-v2');
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
  physicsConfigInput: Partial<PistonOscillationPhysicsConfig> = currentPhysicsConfig,
) => {
  const equilibriumHeightMm = getPistonOscillationSettlingStateAtProgress(
    lockedHeightMm,
    1,
  ).pistonHeightM * 1_000;
  const intervalCount = Math.round(durationS * 1_000);
  let state = initialState;
  let previousHeightM = state.pistonHeightM;
  const downwardCommandActive = endReferenceDragPx > startReferenceDragPx;
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
      preventUpwardMotion: downwardCommandActive,
    }, physicsConfigInput);
    if (downwardCommandActive) {
      assert.ok(
        state.pistonHeightM <= previousHeightM + 1e-12,
        'an advancing downward hand command must not let the piston jump back through the hands',
      );
    }
    previousHeightM = state.pistonHeightM;
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
  }, currentPhysicsConfig);
}
assert.ok(
  heldState.pressurePa < rapidPressurePa,
  'holding the compliant hand position must expose thermal pressure relaxation',
);
assert.ok(
  heldState.pistonHeightM < rapidHeightM,
  'the piston should creep slightly downward while the compressed gas cools against a compliant hand',
);

assert.equal(
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.linearDampingNsPerM,
  PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M,
  'the historical/global press baseline must remain 0.434 N·s/m',
);
assert.equal(PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M, 1.1);
const currentSlow = advanceRamp(80, 0, 200, 1);
const legacySlow = advanceRamp(80, 0, 200, 1, undefined, legacyPhysicsConfig);
assert.ok(
  currentSlow.state.pressurePa / 1_000 >= 120
    && currentSlow.state.pressurePa / 1_000 <= 121.5,
  'the formal 1.1 press loss must retain the accepted 80 mm / 200 px pressure anchor',
);
assert.ok(
  Math.abs(currentSlow.state.pistonHeightM - legacySlow.state.pistonHeightM) * 1_000
    < 0.02,
  'the slow 200 px press endpoint should remain within 0.02 mm of the prior hand feel',
);
const legacyRapid = advanceRamp(80, 0, 200, 0.1, undefined, legacyPhysicsConfig);
assert.ok(
  Math.abs(rapid.state.pistonHeightM - legacyRapid.state.pistonHeightM) * 1_000
    < 0.15,
  'the rapid 200 px press must not develop a visible displacement shortfall',
);
assert.ok(
  Math.abs(rapid.state.pressurePa - legacyRapid.state.pressurePa) / 1_000 < 0.25,
  'the rapid 200 px pressure endpoint must remain close to the prior response',
);
const summarizeRelease = (
  pressed: ReturnType<typeof advanceRamp>,
) => {
  const displacementMm = pressed.state.pistonHeightM * 1_000
    - pressed.equilibriumHeightMm;
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: 80,
    initialDisplacementMm: displacementMm,
    initialVelocityMmPerS: pressed.state.velocityMPerS * 1_000,
    referenceThermodynamicState: pressed.state,
  }, { sensorSampleRateHz: 1_000 });
  const observed = createPistonOscillationDynamicSensorObservationSeries(
    trajectory.samples,
    1_000,
  );
  const firstWindow = observed.samples.filter((sample) => sample.timeS <= 0.06);
  return {
    displacementMm,
    triggerTimeS: findPistonOscillationObservedFallingTriggerSample(
      observed,
      120,
    )?.timeS ?? null,
    firstMaximumKpa: Math.max(...firstWindow.map(
      (sample) => sample.absolutePressureKpa,
    )),
    firstMinimumKpa: Math.min(...firstWindow.map(
      (sample) => sample.absolutePressureKpa,
    )),
  };
};
const currentRapidRelease = summarizeRelease(rapid);
const legacyRapidRelease = summarizeRelease(legacyRapid);
assert.equal(
  currentRapidRelease.triggerTimeS,
  legacyRapidRelease.triggerTimeS,
  'the formal press loss must not move the 120 kPa trigger sample in the rapid comparison',
);
assert.ok(
  Math.abs(currentRapidRelease.firstMaximumKpa - legacyRapidRelease.firstMaximumKpa)
    < 0.25,
);
assert.ok(
  Math.abs(currentRapidRelease.firstMinimumKpa - legacyRapidRelease.firstMinimumKpa)
    < 0.25,
);

const settled80 = getPistonOscillationSettlingStateAtProgress(80, 1);
const compressedAtRest = advancePistonOscillationPrescribedThermodynamicState({
  referenceState: settled80,
  pistonHeightMm: settled80.pistonHeightM * 1_000 - 12,
  velocityMmPerS: 0,
  elapsedS: 0.2,
});
const upwardFeedbackAllowed = advancePistonOscillationVirtualHandThermodynamicState({
  referenceState: compressedAtRest,
  equilibriumHeightMm: settled80.pistonHeightM * 1_000,
  targetDownwardDisplacementMm: 0,
  elapsedS: 0.02,
});
assert.ok(
  upwardFeedbackAllowed.pistonHeightM > compressedAtRest.pistonHeightM,
  'when downward pointer motion pauses, ordinary force feedback must be allowed to push back upward',
);
const upwardFeedbackConstrained = advancePistonOscillationVirtualHandThermodynamicState({
  referenceState: compressedAtRest,
  equilibriumHeightMm: settled80.pistonHeightM * 1_000,
  targetDownwardDisplacementMm: 0,
  elapsedS: 0.02,
  preventUpwardMotion: true,
});
assert.ok(
  upwardFeedbackConstrained.pistonHeightM <= compressedAtRest.pistonHeightM + 1e-12,
  'an active downward command must block the same upward force response without freezing heat evolution',
);
assert.ok(
  upwardFeedbackConstrained.thermal.cumulativeHeatTransferJ
    !== compressedAtRest.thermal.cumulativeHeatTransferJ,
  'the directional hand constraint must continue the thermal clock at the held volume',
);

console.log('pistonOscillationVirtualHandModel tests passed');
