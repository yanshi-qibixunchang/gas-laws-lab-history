import assert from 'node:assert/strict';
import {
  runHeatCapacityFreeParameterAcceptance,
  HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG,
} from './heatCapacityFreeParameterAcceptance.ts';
import {
  createDefaultHeatCapacityFile,
  recordHeatCapacityFreeTraceEventWithReference,
} from '../../src/features/workbench/workbenchState.ts';

const lowSignalDiagnosticReport = runHeatCapacityFreeParameterAcceptance({
  pumpStrokes: [2, 3, 4, 5],
  openDurationsS: [0, 0.3, 0.7],
});

const targetedReport = runHeatCapacityFreeParameterAcceptance({
  scenarios: [
    {
      id: 'C1-absolute-ideal',
      label: 'absolute ideal instant pump and instant adiabatic release',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-adiabatic-to-ambient',
      pumpStrokes: 18,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'T0-ideal-experiment',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 300,
      leakageEnabled: false,
      leakageRatePerS: 0,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'B0-best-realistic-smoke',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: true,
    },
    {
      id: 'R1-u1-280',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 280,
      openDurationS: 0.35,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R1-u1-320',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 320,
      openDurationS: 0.35,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R2-u2-280',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 280,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R2-u2-320',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 320,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R3-open-0.25',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.25,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'R3-open-0.45',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.45,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E1-u1-too-early',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 0,
      openDurationS: 0.35,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E2-u2-too-early',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 0,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E3-open-0.05-known-gap',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.05,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E4-open-2.5',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 2.5,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E5-open-10',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 10,
      waitAfterReleaseS: 300,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E6-u2-10min',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 600,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E7-u2-20min',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 1200,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'E8-u2-30min-known-gap',
      pumpStrokes: 18,
      pumpTotalDurationS: 12,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
      waitAfterReleaseS: 1800,
      leakageEnabled: true,
      leakageRatePerS: 0.00005,
      instrumentNoiseEnabled: false,
    },
    {
      id: 'C2-instant-current-equivalent-core',
      label: 'single instant pump step and current-model-equivalent instant release',
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-current-model-equivalent',
      pumpStrokes: 18,
      pumpTotalDurationS: 0,
      waitAfterPumpS: 300,
      openDurationS: 0.35,
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
    'C1-absolute-ideal',
    'T0-ideal-experiment',
    'B0-best-realistic-smoke',
    'R1-u1-280',
    'R1-u1-320',
    'R2-u2-280',
    'R2-u2-320',
    'R3-open-0.25',
    'R3-open-0.45',
    'E1-u1-too-early',
    'E2-u2-too-early',
    'E3-open-0.05-known-gap',
    'E4-open-2.5',
    'E5-open-10',
    'E6-u2-10min',
    'E7-u2-20min',
    'E8-u2-30min-known-gap',
    'C2-instant-current-equivalent-core',
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
const absoluteIdeal = targetedById.get('C1-absolute-ideal');
const idealExperiment = targetedById.get('T0-ideal-experiment');
const bestRealisticSmoke = targetedById.get('B0-best-realistic-smoke');
const u1TooEarly = targetedById.get('E1-u1-too-early');
const u2TooEarly = targetedById.get('E2-u2-too-early');
const openVeryLong = targetedById.get('E4-open-2.5');
const openExtremeLong = targetedById.get('E5-open-10');
const u2TenMinute = targetedById.get('E6-u2-10min');
const u2TwentyMinute = targetedById.get('E7-u2-20min');
const u2ThirtyMinuteKnownGap = targetedById.get('E8-u2-30min-known-gap');
const instantCurrentEquivalentReleaseCore = targetedById.get('C2-instant-current-equivalent-core');
assert.notEqual(absoluteIdeal, undefined, 'absolute ideal scenario should exist in targeted acceptance report');
assert.notEqual(idealExperiment, undefined, 'ideal experiment scenario should exist in targeted acceptance report');
assert.notEqual(bestRealisticSmoke, undefined, 'best realistic smoke scenario should exist in targeted acceptance report');
assert.notEqual(u1TooEarly, undefined, 'U1-too-early scenario should exist in targeted acceptance report');
assert.notEqual(u2TooEarly, undefined, 'U2-too-early scenario should exist in targeted acceptance report');
assert.notEqual(openVeryLong, undefined, '2.5s open scenario should exist in targeted acceptance report');
assert.notEqual(openExtremeLong, undefined, '10s open scenario should exist in targeted acceptance report');
assert.notEqual(u2TenMinute, undefined, '10min U2 wait scenario should exist in targeted acceptance report');
assert.notEqual(u2TwentyMinute, undefined, '20min U2 wait scenario should exist in targeted acceptance report');
assert.notEqual(u2ThirtyMinuteKnownGap, undefined, '30min U2 known-gap scenario should exist in targeted acceptance report');
assert.notEqual(instantCurrentEquivalentReleaseCore, undefined, 'instant current-equivalent release core calibration should exist');
assert.equal(
  absoluteIdeal!.gamma !== null &&
    absoluteIdeal!.gamma >= 1.395 &&
    absoluteIdeal!.gamma <= 1.405,
  true,
  'absolute ideal operation should stay inside the six-class 1.395-1.405 target',
);
assert.equal(
  idealExperiment!.gamma !== null &&
    idealExperiment!.gamma >= 1.39 &&
    idealExperiment!.gamma <= 1.41,
  true,
  'ideal experimental operation should stay inside the six-class 1.39-1.41 target',
);
assert.equal(
  bestRealisticSmoke!.gamma !== null &&
    bestRealisticSmoke!.gamma >= 1.37 &&
    bestRealisticSmoke!.gamma <= 1.43,
  true,
  'best realistic smoke run should remain inside 1.37-1.43; the full plan still requires 30 fixed-seed runs',
);
assert.equal(
  u1TooEarly!.gamma !== null &&
    (u1TooEarly!.gamma < 1.3 || u1TooEarly!.gamma > 1.5),
  true,
  'recording U1 immediately should be an extreme wrong operation in the current smoke suite',
);
assert.equal(
  u2TooEarly!.gamma !== null &&
    (u2TooEarly!.gamma < 1.3 || u2TooEarly!.gamma > 1.5),
  true,
  'recording U2 immediately should be an extreme wrong operation in the current smoke suite',
);
assert.equal(
  openVeryLong!.gamma !== null &&
    (openVeryLong!.gamma < 1.34 || openVeryLong!.gamma > 1.46),
  true,
  '2.5s open duration should be outside the suitable-operation 1.34-1.46 band',
);
assert.equal(
  openExtremeLong!.gamma !== null &&
    (openExtremeLong!.gamma < 1.3 || openExtremeLong!.gamma > 1.5),
  true,
  '10s open duration should be an extreme wrong operation',
);
assert.equal(
  u2TenMinute!.gamma !== null &&
    (u2TenMinute!.gamma < 1.37 || u2TenMinute!.gamma > 1.43),
  true,
  '10min U2 wait should leave the 1.37-1.43 best-operation band',
);
assert.equal(
  u2TwentyMinute!.gamma !== null &&
    (u2TwentyMinute!.gamma < 1.34 || u2TwentyMinute!.gamma > 1.46),
  true,
  '20min U2 wait should leave the 1.34-1.46 suitable-operation band',
);
assert.equal(
  u2ThirtyMinuteKnownGap!.u1Recordable && u2ThirtyMinuteKnownGap!.u2Recordable,
  true,
  '30min U2 known-gap scenario should remain recordable so the full validation plan can report the current gap',
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
  absoluteIdeal!.gamma !== null &&
    instantCurrentEquivalentReleaseCore!.gamma !== null &&
    Math.abs(instantCurrentEquivalentReleaseCore!.gamma - absoluteIdeal!.gamma) <= 0.006,
  true,
  'current-model-equivalent instant release should stay close to the ideal instant release core result',
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
    pumpInflowTemperatureRiseK: 42,
    stopcockFlowRate: 4.4,
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

const quickRows = lowSignalDiagnosticReport.rows.filter((row) => row.openDurationS === 0);
assert.deepEqual(
  quickRows.map((row) => row.pumpStrokes),
  [2, 3, 4, 5],
  'legacy low-signal diagnostic smoke should still cover 2-5 pump strokes',
);

for (const strokes of [3, 4]) {
  const row = quickRows.find((candidate) => candidate.pumpStrokes === strokes);
  assert.notEqual(row, undefined, `${strokes} pump strokes should be represented`);
  assert.equal(row?.u1Recordable, true, `${strokes} pump strokes should be recordable as U1`);
  assert.equal(row?.u2Recordable, true, `${strokes} pump strokes should be recordable as U2 after quick release`);
  assert.equal(
    row !== undefined &&
      row.u1CorrectedMv !== null &&
      row.u1CorrectedMv < HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG.minimumUsefulU1CorrectedMv,
    true,
    `${strokes} pump strokes should remain a low-signal diagnostic row instead of being treated as a normal-pressure experiment`,
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
assert.equal(fourStroke?.safetyStatus, 'normal', '4-pump low-signal diagnostic row should remain below the suggested stop line');

const fiveStroke = quickRows.find((row) => row.pumpStrokes === 5);
assert.equal(fiveStroke?.safetyStatus, 'normal', '5-pump low-signal diagnostic row should remain below the suggested stop line');
assert.equal(
  fiveStroke?.u1Recordable,
  true,
  '5 requested pump strokes should remain recordable for low-pressure diagnostic review',
);

const slowClose = lowSignalDiagnosticReport.rows.find((row) => row.pumpStrokes === 4 && row.openDurationS === 0.7);
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
