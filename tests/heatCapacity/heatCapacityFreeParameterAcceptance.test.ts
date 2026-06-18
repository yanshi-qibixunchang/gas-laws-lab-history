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

const targetedReport = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'T0',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R1-u1-early',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 280,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R2-u2-late',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 320,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R3-open-fast',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.15,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R4-pump-3s',
      pumpStrokes: 4,
      pumpTotalDurationS: 3,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E1-open-too-fast',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.1,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E2-open-long',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 2.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E3-u2-early',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 0,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E3-u2-60s',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 60,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E4-pump-30s',
      pumpStrokes: 4,
      pumpTotalDurationS: 30,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E4-pump-60s',
      pumpStrokes: 4,
      pumpTotalDurationS: 60,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'L1-weak-leak-long',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 1800,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'L2-strong-leak',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 600,
      leakageEnabled: true,
      leakageRatePerS: 0.002,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'C1-instant-one-step-4-pump-equivalent',
      label: 'single instant pressure step equivalent to 4 pump strokes',
      pumpMode: 'instant-equivalent',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'C2-instant-pump-ideal-release-core',
      label: 'single instant pump step and ideal instant adiabatic release',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-adiabatic-to-ambient',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'C3-instant-pump-current-equivalent-release-core',
      label: 'single instant pump step and current-model-equivalent instant release',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-current-model-equivalent',
      pumpStrokes: 4,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      instrumentNoiseEnabled: false,
    },
  ],
});

assert.deepEqual(
  targetedReport.rows.map((row) => row.id),
  [
    'T0',
    'R1-u1-early',
    'R2-u2-late',
    'R3-open-fast',
    'R4-pump-3s',
    'E1-open-too-fast',
    'E2-open-long',
    'E3-u2-early',
    'E3-u2-60s',
    'E4-pump-30s',
    'E4-pump-60s',
    'L1-weak-leak-long',
    'L2-strong-leak',
    'C1-instant-one-step-4-pump-equivalent',
    'C2-instant-pump-ideal-release-core',
    'C3-instant-pump-current-equivalent-release-core',
  ],
  'acceptance script should support named physical validation scenarios',
);

for (const row of targetedReport.rows) {
  assert.equal(typeof row.releaseMode, 'string', `${row.id} should report release mode`);
  assert.equal(typeof row.pumpTotalDurationS, 'number', `${row.id} should report pump cadence`);
  assert.equal(typeof row.waitAfterPumpS, 'number', `${row.id} should report U1 wait time`);
  assert.equal(typeof row.waitAfterReleaseS, 'number', `${row.id} should report U2 wait time`);
  assert.equal(typeof row.leakageEnabled, 'boolean', `${row.id} should report leakage status`);
  assert.equal(typeof row.leakageRatePerS, 'number', `${row.id} should report leakage rate`);
  assert.equal(typeof row.pressureKPa, 'number', `${row.id} should report final pressure`);
  assert.equal(typeof row.gasTemperatureK, 'number', `${row.id} should report final gas temperature`);
  assert.equal(typeof row.gasAmountRatio, 'number', `${row.id} should report final gas amount`);
}

const targetedById = new Map(targetedReport.rows.map((row) => [row.id, row]));
const theoreticalCenter = targetedById.get('T0');
const reasonableFastOpen = targetedById.get('R3-open-fast');
const reasonablePumpCadence = targetedById.get('R4-pump-3s');
const oneMinuteU2Record = targetedById.get('E3-u2-60s');
const verySlowPumpCadence = targetedById.get('E4-pump-60s');
const instantOneStepFourPumpEquivalent = targetedById.get('C1-instant-one-step-4-pump-equivalent');
const instantIdealReleaseCore = targetedById.get('C2-instant-pump-ideal-release-core');
const instantCurrentEquivalentReleaseCore = targetedById.get('C3-instant-pump-current-equivalent-release-core');
assert.notEqual(theoreticalCenter, undefined, 'T0 should exist in targeted acceptance report');
assert.notEqual(reasonableFastOpen, undefined, 'R3-open-fast should exist in targeted acceptance report');
assert.notEqual(reasonablePumpCadence, undefined, 'R4-pump-3s should exist in targeted acceptance report');
assert.notEqual(oneMinuteU2Record, undefined, 'E3-u2-60s should exist in targeted acceptance report');
assert.notEqual(verySlowPumpCadence, undefined, 'E4-pump-60s should exist in targeted acceptance report');
assert.notEqual(instantOneStepFourPumpEquivalent, undefined, 'instant one-step four-pump-equivalent core calibration should exist');
assert.notEqual(instantIdealReleaseCore, undefined, 'instant ideal release core calibration should exist');
assert.notEqual(instantCurrentEquivalentReleaseCore, undefined, 'instant current-equivalent release core calibration should exist');
assert.equal(
  theoreticalCenter!.gamma !== null &&
    theoreticalCenter!.gamma >= 1.38 &&
    theoreticalCenter!.gamma <= 1.42,
  true,
  'theoretical 5 minute operation should stay within the current 1.40 +- 0.02 calibration target',
);
assert.equal(
  theoreticalCenter!.gamma !== null &&
    reasonableFastOpen!.gamma !== null &&
    reasonableFastOpen!.gamma <= theoreticalCenter!.gamma + 0.04,
  true,
  '0.15s reasonable fast opening should not overshoot the theoretical center by more than 0.04 gamma',
);
assert.equal(
  theoreticalCenter!.gamma !== null &&
    oneMinuteU2Record!.gamma !== null &&
    oneMinuteU2Record!.gamma <= theoreticalCenter!.gamma - 0.0008,
  true,
  'U2 recorded after only 60s should remain slightly below the 300s theoretical wait so recovery is not effectively complete too early',
);
assert.equal(
  theoreticalCenter!.gamma !== null &&
    reasonablePumpCadence!.gamma !== null &&
    Math.abs(reasonablePumpCadence!.gamma - theoreticalCenter!.gamma) <= 0.005,
  true,
  '4 pump strokes completed within 3s should stay equivalent to the near-instant theoretical cadence',
);
assert.equal(
  instantOneStepFourPumpEquivalent!.pumpStrokes,
  4,
  'instant core calibration should preserve the four-pump equivalent count',
);
assert.equal(
  instantOneStepFourPumpEquivalent!.pumpMode,
  'instant-equivalent',
  'instant core calibration should report one state jump instead of runtime pump stroke timing',
);
assert.equal(
  instantOneStepFourPumpEquivalent!.releaseMode,
  'runtime-open-flow',
  'existing instant pump calibration should still use the normal runtime release path',
);
assert.equal(
  instantOneStepFourPumpEquivalent!.u1Recordable && instantOneStepFourPumpEquivalent!.u2Recordable,
  true,
  'instant one-step four-pump-equivalent core calibration should be recordable',
);
assert.equal(
  instantOneStepFourPumpEquivalent!.gamma !== null &&
    Math.abs(instantOneStepFourPumpEquivalent!.gamma - 1.4) <= 0.02,
  true,
  'instant one-step four-pump-equivalent core calibration should stay close to the 1.4 theoretical gas value',
);
assert.equal(
  instantIdealReleaseCore!.pumpMode,
  'instant-equivalent',
  'ideal release core calibration should also use one instant pump state jump',
);
assert.equal(
  instantIdealReleaseCore!.releaseMode,
  'instant-adiabatic-to-ambient',
  'ideal release core calibration should report the analytical instant release mode',
);
assert.equal(
  instantIdealReleaseCore!.u1Recordable && instantIdealReleaseCore!.u2Recordable,
  true,
  'ideal instant release core calibration should be recordable',
);
assert.equal(
  instantIdealReleaseCore!.gamma !== null &&
    Math.abs(instantIdealReleaseCore!.gamma - 1.4) <= 0.005,
  true,
  'ideal instant release core calibration should be very close to the 1.4 theoretical gas value',
);
assert.equal(
  instantCurrentEquivalentReleaseCore!.releaseMode,
  'instant-current-model-equivalent',
  'current-equivalent core calibration should report the model-equivalent instant release mode',
);
assert.equal(
  instantCurrentEquivalentReleaseCore!.u1Recordable && instantCurrentEquivalentReleaseCore!.u2Recordable,
  true,
  'current-equivalent instant release core calibration should be recordable',
);
assert.equal(
  instantIdealReleaseCore!.gamma !== null &&
    instantCurrentEquivalentReleaseCore!.gamma !== null &&
    Math.abs(instantCurrentEquivalentReleaseCore!.gamma - instantIdealReleaseCore!.gamma) <= 0.006,
  true,
  'current-model-equivalent instant release should stay close to the ideal instant release core result',
);
assert.equal(
  theoreticalCenter!.u1CorrectedMv !== null &&
    verySlowPumpCadence!.u1CorrectedMv !== null &&
    verySlowPumpCadence!.u1CorrectedMv < theoreticalCenter!.u1CorrectedMv - 0.25,
  true,
  'very slow pumping should leave a detectable lower U1 signal through leakage and thermal history even if final gamma remains stable',
);

assert.equal(
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
  90,
  'parameter acceptance should preserve the 90 mV Free U1 diagnostic threshold',
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
    row !== undefined && row.gamma !== null && row.gamma >= 1.32 && row.gamma <= 1.39,
    true,
    `${strokes} pump strokes should produce a plausible gamma after wall-mediated heat exchange`,
  );
}

const twoStroke = quickRows.find((row) => row.pumpStrokes === 2);
assert.equal(twoStroke?.u1Recordable, true, '2 pump strokes should be recordable after minimum U1 is downgraded to diagnostics');
assert.equal(twoStroke?.u2Recordable, true, '2 pump strokes should remain recordable through U2 for later diagnosis');
assert.equal(
  twoStroke !== undefined &&
    twoStroke.u1CorrectedMv !== null &&
    twoStroke.u1CorrectedMv < HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
  true,
  '2 pump strokes should stay below the diagnostic U1 threshold even though recording is allowed',
);
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
    slowClose.gamma < quickFourStroke.gamma - 0.015,
  true,
  'moderately slow close should visibly degrade gamma in the acceptance report',
);

console.log('heatCapacityFreeParameterAcceptance tests passed');
