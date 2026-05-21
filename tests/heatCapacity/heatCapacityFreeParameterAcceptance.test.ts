import assert from 'node:assert/strict';
import {
  runHeatCapacityFreeParameterAcceptance,
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG,
} from './heatCapacityFreeParameterAcceptance.ts';
import {
  createDefaultHeatCapacityFile,
  recordHeatCapacityFreeTraceEventWithReference,
} from '../../src/features/workbench/workbenchState.ts';

const report = runHeatCapacityFreeParameterAcceptance({
  pumpStrokes: [6, 7, 8, 9, 10, 11, 12],
  openDurationsS: [0, 0.3, 0.7],
});

assert.equal(
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
  90,
  'parameter acceptance should preserve the 90 mV Free U1 record threshold',
);

const configuredFile = createDefaultHeatCapacityFile(91);
const tracedConfiguredFile = recordHeatCapacityFreeTraceEventWithReference({
  ...configuredFile,
  heatCapacityFreeEnvironmentConfig: {
    ambientPressureKPa: 100.8,
    ambientTemperatureK: 299.25,
  },
  heatCapacityFreePhysicsConfig: {
    ...configuredFile.heatCapacityFreePhysicsConfig,
    gamma: 1.37,
    vesselVolumeL: 2.4,
    pumpAmountGainRatio: 0.0065,
    pumpTemperatureGainK: 1.65,
    sealedThermalRate: 0.45,
    openThermalRate: 1.85,
    stopcockFlowRate: 4.4,
    releaseCoolingFactor: 0.92,
  },
  heatCapacityFreeSensorConfig: {
    ...configuredFile.heatCapacityFreeSensorConfig,
    pressureMvPerKPa: 21.5,
    temperatureMvAtAmbient: 1501.2,
    temperatureMvPerK: 2.2,
    lagRate: 4.5,
    noiseMv: 0.03,
    quantizationMv: 0.02,
  },
}, 'power-on', 100).file;
const configuredTraceTrial = tracedConfiguredFile.heatCapacityFreeTraceStore.traceTrials.find((traceTrial) => (
  traceTrial.id === tracedConfiguredFile.heatCapacityFreeTraceStore.activeTraceTrialId
));
assert.notEqual(configuredTraceTrial, undefined, 'Free trace trial should exist after a traced event');
assert.equal(configuredTraceTrial!.configSnapshot.environment.ambientPressureKPa, 100.8);
assert.equal(configuredTraceTrial!.configSnapshot.environment.ambientTemperatureK, 299.25);
assert.equal(configuredTraceTrial!.configSnapshot.physics.gamma, 1.37);
assert.equal(configuredTraceTrial!.configSnapshot.physics.vesselVolumeL, 2.4);
assert.equal(configuredTraceTrial!.configSnapshot.physics.pumpAmountGainRatio, 0.0065);
assert.equal(configuredTraceTrial!.configSnapshot.sensor.pressureMvPerKPa, 21.5);
assert.equal(configuredTraceTrial!.configSnapshot.sensor.temperatureMvAtAmbient, 1501.2);
assert.equal(configuredTraceTrial!.configSnapshot.record.minimumUsefulU1CorrectedMv, 90);
assert.equal(configuredTraceTrial!.configSnapshot.record.pressureDangerMv, 140);
const changedAfterTrace = {
  ...tracedConfiguredFile,
  heatCapacityFreeEnvironmentConfig: {
    ...tracedConfiguredFile.heatCapacityFreeEnvironmentConfig,
    ambientPressureKPa: 120,
  },
};
assert.equal(
  changedAfterTrace.heatCapacityFreeTraceStore.traceTrials[0].configSnapshot.environment.ambientPressureKPa,
  100.8,
  'Free config snapshot should be copied at trace creation instead of reading later file config changes',
);

const quickRows = report.rows.filter((row) => row.openDurationS === 0);
assert.deepEqual(
  quickRows.map((row) => row.pumpStrokes),
  [6, 7, 8, 9, 10, 11, 12],
  'acceptance script should cover 6-12 pump strokes for quick-release operation',
);

for (const strokes of [9, 10, 11]) {
  const row = quickRows.find((candidate) => candidate.pumpStrokes === strokes);
  assert.notEqual(row, undefined, `${strokes} pump strokes should be represented`);
  assert.equal(row?.safetyStatus, 'normal', `${strokes} pump strokes should stay inside the normal safety band`);
  assert.equal(row?.u1Recordable, true, `${strokes} pump strokes should be recordable as U1`);
  assert.equal(row?.u2Recordable, true, `${strokes} pump strokes should be recordable as U2 after quick release`);
  assert.equal(
    row !== undefined && row.gamma !== null && row.gamma >= 1.395 && row.gamma <= 1.405,
    true,
    `${strokes} pump strokes should produce an accurate gamma with the exact pressure formula`,
  );
}

const sixStroke = quickRows.find((row) => row.pumpStrokes === 6);
assert.equal(sixStroke?.u1Recordable, false, '6 pump strokes should remain below the unchanged U1 recording threshold');

const twelveStroke = quickRows.find((row) => row.pumpStrokes === 12);
assert.equal(twelveStroke?.safetyStatus, 'warning', '12 pump strokes should enter warning before the danger line');

const slowClose = report.rows.find((row) => row.pumpStrokes === 10 && row.openDurationS === 0.7);
assert.equal(slowClose?.u2Recordable, true, 'moderately slow close should still produce a recordable U2 row');
assert.equal(
  slowClose !== undefined && slowClose.gamma !== null && slowClose.gamma < 1.25,
  true,
  'moderately slow close should visibly degrade gamma in the acceptance report',
);

console.log('heatCapacityFreeParameterAcceptance tests passed');


