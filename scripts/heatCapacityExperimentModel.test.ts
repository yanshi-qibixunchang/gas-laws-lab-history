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

assert.equal(applyPressureZero(8.4, 1.2), 7.2);

const ambientSignals = mapHeatCapacitySignals({
  ambientTemperatureK: 298.15,
  gasTemperatureK: 298.15,
  pressureDeltaKPa: 0,
  pressureZeroOffset: 0,
});
assert.equal(ambientSignals.temperatureSignalMv, 1500);
assert.equal(ambientSignals.pressureSignalMvRaw, 0);
assert.equal(ambientSignals.pressureSignalMvDisplayed, 0);

const powered = powerHeatCapacityRuntimeState(
  createDefaultHeatCapacityRuntimeState(1_000),
  true,
  1_000,
);
assert.equal(powered.heatCapacityPhase, 'readyToZero');
assert.equal(powered.temperatureSignalMv, 1500);
assert.equal(powered.pressureSignalMvRaw, 0);
assert.equal(powered.pressureSignalMvDisplayed, 0);
assert.equal(powered.heatCapacityTrace.length, 1);

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

const released = stepHeatCapacityExperiment(
  suitablePump.state,
  { ...baseControls, stopcockOpen: true },
  0.5,
  1_900,
);
assert.equal(released.heatCapacityPhase, 'releasing');
assert.equal(released.pressureDeltaKPa < suitablePump.state.pressureDeltaKPa * 0.35, true);
assert.equal(released.temperatureSignalMv < suitablePump.state.temperatureSignalMv, true);

const recovered = stepHeatCapacityExperiment(
  released,
  { ...baseControls, stopcockOpen: false },
  2.5,
  4_400,
);
assert.equal(recovered.heatCapacityPhase === 'recovering' || recovered.heatCapacityPhase === 'sealedStabilizing', true);
assert.equal(Math.abs(recovered.gasTemperatureK - recovered.ambientTemperatureK) < Math.abs(released.gasTemperatureK - released.ambientTemperatureK), true);

const sampled = captureHeatCapacityProcessSample(recovered, 'afterReleaseSample', {
  pumpFrequency: 0.67,
  pumpValveOpen: true,
  stopcockOpen: true,
});
assert.equal(sampled.heatCapacityProcessSamples.afterReleaseSample?.phase, recovered.heatCapacityPhase);
assert.equal(sampled.heatCapacityProcessSamples.afterReleaseSample?.pressureSignalMv, recovered.pressureSignalMvDisplayed);
assert.equal(sampled.heatCapacityProcessSamples.afterReleaseSample?.pumpFrequency, 0.67);
assert.equal(sampled.heatCapacityProcessSamples.afterReleaseSample?.pumpValveOpen, true);
assert.equal(sampled.heatCapacityProcessSamples.afterReleaseSample?.stopcockOpen, true);
assert.equal(sampled.heatCapacityTrace.length >= 2, true);

console.log('heatCapacityExperimentModel tests passed');
