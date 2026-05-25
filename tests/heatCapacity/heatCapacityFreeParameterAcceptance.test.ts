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
  pumpStrokes: [2, 3, 4, 5],
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
    pumpPressureLimitKPa: 112,
    pumpTemperatureGainK: 0.35,
    stopcockFlowRate: 4.4,
    releaseCoolingFactor: 0.92,
    thermal: {
      gasWallConductanceWPerK: 0.45,
      wallAmbientConductanceWPerK: 1.85,
      wallHeatCapacityJPerK: 45,
      minimumGasHeatCapacityJPerK: 0.1,
    },
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
assert.equal(configuredTraceTrial!.configSnapshot.physics.thermal.gasWallConductanceWPerK, 0.45);
assert.equal(configuredTraceTrial!.configSnapshot.physics.thermal.wallAmbientConductanceWPerK, 1.85);
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
  [2, 3, 4, 5],
  'acceptance script should cover the new 2-5 pump-stroke boundary for quick-release operation',
);

for (const strokes of [3, 4]) {
  const row = quickRows.find((candidate) => candidate.pumpStrokes === strokes);
  assert.notEqual(row, undefined, `${strokes} pump strokes should be represented`);
  assert.equal(row?.u1Recordable, true, `${strokes} pump strokes should be recordable as U1`);
  assert.equal(row?.u2Recordable, true, `${strokes} pump strokes should be recordable as U2 after quick release`);
  assert.equal(
    row !== undefined && row.gamma !== null && row.gamma >= 1.35 && row.gamma <= 1.39,
    true,
    `${strokes} pump strokes should produce a plausible gamma after wall-mediated heat exchange`,
  );
}

const twoStroke = quickRows.find((row) => row.pumpStrokes === 2);
assert.equal(twoStroke?.u1Recordable, false, '2 pump strokes should remain below the unchanged U1 recording threshold');
assert.equal(twoStroke?.safetyStatus, 'normal', '2 pump strokes should remain below the warning line');

const fourStroke = quickRows.find((row) => row.pumpStrokes === 4);
assert.equal(fourStroke?.safetyStatus, 'warning', '4 pump strokes should enter warning before the danger line');

const fiveStroke = quickRows.find((row) => row.pumpStrokes === 5);
assert.equal(fiveStroke?.safetyStatus, 'warning', '5 pump strokes should be blocked before entering the alarm line');
assert.equal(
  fiveStroke?.u1Recordable,
  false,
  '5 requested pump strokes should surface the pressure-danger record guard after the excessive stroke is blocked',
);

const slowClose = report.rows.find((row) => row.pumpStrokes === 4 && row.openDurationS === 0.7);
assert.equal(slowClose?.u2Recordable, true, 'moderately slow close should still produce a recordable U2 row');
const quickFourStroke = quickRows.find((row) => row.pumpStrokes === 4);
assert.equal(
  slowClose !== undefined &&
    slowClose.gamma !== null &&
    quickFourStroke !== undefined &&
    quickFourStroke.gamma !== null &&
    slowClose.gamma < quickFourStroke.gamma - 0.02,
  true,
  'moderately slow close should visibly degrade gamma in the acceptance report',
);

console.log('heatCapacityFreeParameterAcceptance tests passed');


