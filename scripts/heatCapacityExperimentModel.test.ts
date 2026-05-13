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

assert.equal(applyPressureZero(8.4, 1.2), 7.2);

const ambientSignals = mapHeatCapacitySignals({
  ambientTemperatureK: 298.15,
  gasTemperatureK: 298.15,
  pressureDeltaKPa: 0,
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
};
const offsetState = updateHeatCapacityRuntimeZeroOffset(preOffsetState, 4.25, 1_100);
assert.equal(offsetState.pressureSignalMvDisplayed, 5.75);
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
assert.equal(recovered.temperatureSignalMv > released.temperatureSignalMv, true);
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
