import assert from 'node:assert/strict';
import {
  applyHeatCapacityPumpStroke,
  captureHeatCapacityProcessSample,
  createDefaultHeatCapacityRuntimeState,
  powerHeatCapacityRuntimeState,
  stepHeatCapacityExperiment,
  updateHeatCapacityRuntimeZeroOffset,
} from '../components/heatCapacity/heatCapacityExperimentModel.ts';
import {
  calculateAirHeatCapacityTargets,
  createHeatCapacityExperimentProfile,
  type HeatCapacityTeachingProfile,
} from '../components/heatCapacity/heatCapacityExperimentRandom.ts';
import {
  HEAT_CAPACITY_VIDEO_PROFILE,
  getHeatCapacityRangeMidpoint,
} from '../components/heatCapacity/heatCapacityDisplayResponse.ts';
import {
  applyPressureZero,
  mapHeatCapacitySignals,
} from '../components/heatCapacity/heatCapacitySensorMapping.ts';

const baseControls = {
  powerOn: true,
  pumpValveOpen: false,
  stopcockOpen: false,
  pumpFrequency: 0,
  pumpFrequencyStatus: 'idle' as const,
};
const initialTemperatureMv = getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.initialTemperatureMvRange);
const teachingPresetValueFields: Array<keyof HeatCapacityTeachingProfile> = [
  'gammaTarget',
  'theoreticalGamma',
  'u0TargetMv',
  'u1TargetMv',
  'u2TargetMv',
  'u0MeasuredMv',
  'u1MeasuredMv',
  'u2MeasuredMv',
  'pumpPeakPressureMv',
  'stableBeforeReleaseMv',
  'recoveryPressureMv',
  'ambientTemperatureMv',
  'initialTemperatureMv',
  'stableTemperatureMv',
  'releaseTemperatureLowMv',
  'recoveryTemperatureMv',
  'pumpEfficiency',
  'releaseSpeed',
  'thermalRecoveryRate',
  'displayNoiseLevel',
];

const teachingProfile = createHeatCapacityExperimentProfile('batch-0-teaching-profile');
assert.deepEqual(
  Object.keys(teachingProfile).sort(),
  ['seed', ...teachingPresetValueFields].sort(),
  'teaching profile field inventory should stay explicit before Free Mode boundary edits',
);
assert.equal(teachingProfile.u1MeasuredMv >= 105 && teachingProfile.u1MeasuredMv <= 130, true);
assert.equal(
  Math.abs(teachingProfile.u2MeasuredMv - teachingProfile.u1MeasuredMv * (1 - 1 / teachingProfile.gammaTarget)) <= 1,
  true,
  'teaching profile U2 should stay near U1 * (1 - 1 / gamma)',
);
const teachingProfileTargets = calculateAirHeatCapacityTargets(teachingProfile);
assert.equal(teachingProfileTargets.gamma >= 1.36 && teachingProfileTargets.gamma <= 1.44, true);

assert.equal(applyPressureZero(8.4, 0.6, -1.2), 7.8);
assert.equal(applyPressureZero(0, 0.6, -0.6), 0);

const ambientSignals = mapHeatCapacitySignals({
  ambientTemperatureK: 298.15,
  gasTemperatureK: 298.15,
  pressureDeltaKPa: 0,
  pressureInitialBiasMv: 0,
  pressureZeroOffset: 0,
});
assert.equal(ambientSignals.temperatureSignalMv, initialTemperatureMv);
assert.equal(ambientSignals.pressureSignalMvRaw, 0);
assert.equal(ambientSignals.pressureSignalMvDisplayed, 0);

const powered = powerHeatCapacityRuntimeState(
  createDefaultHeatCapacityRuntimeState(1_000),
  true,
  1_000,
);
assert.equal(powered.heatCapacityPhase, 'readyToZero');
assert.equal(powered.temperatureSignalMv, initialTemperatureMv);
assert.equal(powered.pressureSignalMvRaw, 0);
assert.equal(powered.pressureSignalMvDisplayed, 0);
assert.equal('heatCapacityTrace' in powered, false, 'runtime should not accumulate realtime chart trace history');

const preOffsetState = {
  ...powered,
  gasPressureKPaAbs: powered.ambientPressureKPa + 0.5,
  pressureSignalMvRaw: 10,
  pressureSignalMvDisplayed: 10,
  pressureInitialBiasMv: 0.6,
};
const offsetState = updateHeatCapacityRuntimeZeroOffset(preOffsetState, -4.25, 1_100);
assert.equal(offsetState.pressureSignalMvDisplayed, 6.35);
assert.equal(offsetState.temperatureSignalMv, powered.temperatureSignalMv);
assert.equal(offsetState.gasPressureKPaAbs, preOffsetState.gasPressureKPaAbs);
assert.equal(offsetState.pressureDeltaKPa, 0.5);

const closedPump = applyHeatCapacityPumpStroke(powered, baseControls, 1_200);
assert.equal(closedPump.accepted, false);
assert.equal(closedPump.reason, 'pumpValveClosed');
assert.equal(closedPump.state.gasPressureKPaAbs, powered.gasPressureKPaAbs);
assert.equal(closedPump.state.gasTemperatureK, powered.gasTemperatureK);
assert.equal(closedPump.state.pressureSignalMvDisplayed, powered.pressureSignalMvDisplayed);

const openStopcockPump = applyHeatCapacityPumpStroke(
  powered,
  {
    ...baseControls,
    pumpValveOpen: true,
    stopcockOpen: true,
    pumpFrequencyStatus: 'suitable',
    pumpFrequency: 0.67,
  },
  1_250,
);
assert.equal(openStopcockPump.accepted, false);
assert.equal(openStopcockPump.reason, 'stopcockOpen');
assert.equal(openStopcockPump.state.gasPressureKPaAbs, powered.gasPressureKPaAbs);
assert.equal(openStopcockPump.state.gasTemperatureK, powered.gasTemperatureK);

const slowPump = applyHeatCapacityPumpStroke(
  powered,
  {
    ...baseControls,
    pumpValveOpen: true,
    pumpFrequencyStatus: 'tooSlow',
    pumpFrequency: 0.33,
  },
  1_300,
);
assert.equal(slowPump.accepted, true);
assert.equal(slowPump.state.heatCapacityPhase, 'pumping');
assert.equal(slowPump.state.pressureDeltaKPa > powered.pressureDeltaKPa, true);
assert.equal(slowPump.state.temperatureSignalMv > powered.temperatureSignalMv, true);
assert.equal(slowPump.state.pressureSignalMvRaw >= 2, true);
assert.equal(slowPump.state.pressureSignalMvRaw <= 6, true);

const suitablePump = applyHeatCapacityPumpStroke(
  slowPump.state,
  {
    ...baseControls,
    pumpValveOpen: true,
    pumpFrequencyStatus: 'suitable',
    pumpFrequency: 0.67,
  },
  1_400,
);
assert.equal(suitablePump.accepted, true);
assert.equal(
  suitablePump.state.pressureDeltaKPa - slowPump.state.pressureDeltaKPa >
    slowPump.state.pressureDeltaKPa - powered.pressureDeltaKPa,
  true,
);
const suitableGainMv = suitablePump.state.pressureSignalMvRaw - slowPump.state.pressureSignalMvRaw;
assert.equal(suitableGainMv >= 10, true);
assert.equal(suitableGainMv <= 25, true);

let warmedByPumping = suitablePump.state;
for (let index = 0; index < 8; index += 1) {
  warmedByPumping = applyHeatCapacityPumpStroke(
    warmedByPumping,
    {
      ...baseControls,
      pumpValveOpen: true,
      pumpFrequencyStatus: 'suitable',
      pumpFrequency: 0.82,
    },
    1_500 + index * 450,
  ).state;
}
const warmedTemperatureMv = warmedByPumping.temperatureSignalMv;
const sealedCooling = stepHeatCapacityExperiment(
  warmedByPumping,
  baseControls,
  2,
  7_000,
);
assert.equal(
  sealedCooling.temperatureSignalMv < warmedTemperatureMv,
  true,
  'sealed waiting after pumping should allow over-heated temperature signal to fall toward the stable target',
);

let sealedRoomRecovery = warmedByPumping;
for (let index = 0; index < 12; index += 1) {
  sealedRoomRecovery = stepHeatCapacityExperiment(
    sealedRoomRecovery,
    baseControls,
    1,
    7_500 + index * 1_000,
  );
}
assert.equal(
  sealedRoomRecovery.temperatureSignalMv < warmedTemperatureMv,
  true,
  'sealed waiting should keep cooling the pumped air instead of holding a high temperature plateau',
);
assert.equal(
  Math.abs(sealedRoomRecovery.temperatureSignalMv - initialTemperatureMv) <= 0.6,
  true,
  'sealed waiting before U1 should return U_T close to the room-temperature baseline',
);
assert.equal(
  sealedRoomRecovery.heatCapacityPhase,
  'sealedStabilizing',
  'pre-release high-pressure waiting should stay in the sealed-stabilizing phase, not recovery',
);

const released = stepHeatCapacityExperiment(
  suitablePump.state,
  { ...baseControls, stopcockOpen: true },
  0.5,
  1_900,
);
assert.equal(released.heatCapacityPhase, 'releasing');
assert.equal(released.pressureDeltaKPa < suitablePump.state.pressureDeltaKPa * 0.35, true);

const recovered = stepHeatCapacityExperiment(
  released,
  { ...baseControls, stopcockOpen: false },
  2.5,
  4_400,
);
assert.equal(recovered.heatCapacityPhase === 'recovering' || recovered.heatCapacityPhase === 'sealedStabilizing', true);
assert.equal(
  Math.abs(recovered.temperatureSignalMv - initialTemperatureMv) < Math.abs(released.temperatureSignalMv - initialTemperatureMv),
  true,
  'closing the stopcock after release should move U_T toward the room-temperature baseline',
);
assert.equal(recovered.pressureSignalMvRaw > released.pressureSignalMvRaw, true);

let pumpedSeries = powered;
for (let index = 0; index < 14; index += 1) {
  pumpedSeries = applyHeatCapacityPumpStroke(
    pumpedSeries,
    {
      ...baseControls,
      pumpValveOpen: true,
      pumpFrequencyStatus: 'suitable',
      pumpFrequency: 0.9,
    },
    5_000 + index * 350,
  ).state;
}
assert.equal(
  pumpedSeries.pressureSignalMvRaw > HEAT_CAPACITY_VIDEO_PROFILE.pumpPeakPressureMvRange[1],
  true,
);

const stableTargetMv = getHeatCapacityRangeMidpoint(HEAT_CAPACITY_VIDEO_PROFILE.stablePressureMvRange);
const stabilized = stepHeatCapacityExperiment(
  pumpedSeries,
  baseControls,
  8,
  16_000,
);
assert.equal(stabilized.pressureSignalMvRaw <= pumpedSeries.pressureSignalMvRaw, true);
assert.equal(
  Math.abs(stabilized.pressureSignalMvRaw - stableTargetMv) <
    Math.abs(pumpedSeries.pressureSignalMvRaw - stableTargetMv),
  true,
);

const highPressureReleased = stepHeatCapacityExperiment(
  stabilized,
  { ...baseControls, stopcockOpen: true },
  0.6,
  16_600,
);
assert.equal(highPressureReleased.pressureSignalMvRaw < 1, true);
assert.equal(highPressureReleased.temperatureSignalMv < stabilized.temperatureSignalMv, true);

const closedRecovery = stepHeatCapacityExperiment(
  highPressureReleased,
  { ...baseControls, stopcockOpen: false },
  2.5,
  19_100,
);
assert.equal(
  closedRecovery.temperatureSignalMv > highPressureReleased.temperatureSignalMv,
  true,
  'closing the stopcock after release should recover temperature upward from the release low point',
);
assert.equal(
  closedRecovery.temperatureSignalMv < stabilized.temperatureSignalMv,
  true,
  'thermal recovery should not jump back to the high pre-release stable temperature',
);

let heldOpenAfterRelease = highPressureReleased;
for (let index = 0; index < 3; index += 1) {
  heldOpenAfterRelease = stepHeatCapacityExperiment(
    heldOpenAfterRelease,
    { ...baseControls, stopcockOpen: true },
    1,
    17_600 + index * 1_000,
  );
}
assert.equal(
  heldOpenAfterRelease.temperatureSignalMv > highPressureReleased.temperatureSignalMv,
  true,
  'holding the stopcock open after release should still let the gas warm toward room temperature',
);

const longOpenClosedRecovery = stepHeatCapacityExperiment(
  heldOpenAfterRelease,
  { ...baseControls, stopcockOpen: false },
  2.5,
  21_100,
);
assert.equal(
  longOpenClosedRecovery.pressureSignalMvRaw < closedRecovery.pressureSignalMvRaw * 0.75,
  true,
  'holding the stopcock open for several seconds should reduce the later sealed pressure rebound',
);

let roomRecoveredAfterRelease = highPressureReleased;
for (let index = 0; index < 14; index += 1) {
  roomRecoveredAfterRelease = stepHeatCapacityExperiment(
    roomRecoveredAfterRelease,
    { ...baseControls, stopcockOpen: false },
    1,
    19_800 + index * 1_000,
  );
}
assert.equal(
  roomRecoveredAfterRelease.temperatureSignalMv > highPressureReleased.temperatureSignalMv,
  true,
  'closed recovery after release should warm back upward from the release low point',
);
assert.equal(
  Math.abs(roomRecoveredAfterRelease.temperatureSignalMv - initialTemperatureMv) <= 0.6,
  true,
  'closed recovery before U2 should return U_T close to the room-temperature baseline',
);

const sampled = captureHeatCapacityProcessSample(recovered, 'releaseLowSample', {
  pumpFrequency: 0.67,
  pumpValveOpen: true,
  stopcockOpen: true,
});
assert.equal(sampled.heatCapacityProcessSamples.releaseLowSample?.phase, recovered.heatCapacityPhase);
assert.equal(sampled.heatCapacityProcessSamples.releaseLowSample?.pressureSignalMv, recovered.pressureSignalMvDisplayed);
assert.equal(sampled.heatCapacityProcessSamples.releaseLowSample?.pumpFrequency, 0.67);
assert.equal(sampled.heatCapacityProcessSamples.releaseLowSample?.pumpValveOpen, true);
assert.equal(sampled.heatCapacityProcessSamples.releaseLowSample?.stopcockOpen, true);
assert.equal('heatCapacityTrace' in sampled, false, 'process sampling should stay independent from realtime chart history');

console.log('heatCapacityExperimentModel tests passed');
