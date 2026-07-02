import assert from 'node:assert/strict';
import {
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
  removeHeatCapacityFreeTrialRecord,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  evaluateFreeU0Record,
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordConfig,
  type HeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  calculateHeatCapacityMeanResult,
  createHeatCapacityTrial,
} from '../../src/domain/heatCapacity/heatCapacityTrialModel.ts';

const recordConfig: HeatCapacityFreeRecordConfig = {
  pressureStableSlopeMvPerS: 0.15,
  temperatureStableSlopeMvPerS: 0.2,
  temperatureAmbientToleranceMv: 0.6,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: 25,
  overVentedMinimumU2CorrectedMv: 0.5,
  pressureDangerMv: 260,
};

const calibration: HeatCapacityFreeCalibrationState = {
  calibrationVersion: 1,
  zeroOffsetMv: 0.18,
  zeroEvents: [
    {
      id: 'zero-1',
      atS: 1,
      displayPressureMv: 0.18,
      displayTemperatureMv: 1499,
      zeroOffsetMv: 0.18,
      source: 'user',
    },
  ],
  automaticU0: null,
};

const automaticU0 = captureAutomaticU0IfReady(calibration, {
  atS: 2,
  powerOn: true,
  stopcockOpen: true,
  zeroed: true,
  zeroEventId: 'zero-1',
  pressureStable: true,
  temperatureStable: true,
  displayPressureMv: 0.02,
  displayTemperatureMv: 1499,
}).automaticU0;

assert.notEqual(automaticU0, null, 'stable open-stopcock zeroed state should capture automatic U0');

const physicsConfig = {
  environment: {
    ambientTemperatureK: 298.15,
    ambientPressureKPa: 101.3,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.022,
  pumpPressureLimitKPa: 108.3,
  stopcockFlowRate: 4,
  thermal: {
    gasWallConductanceWPerK: 0.4,
    wallAmbientConductanceWPerK: 1.6,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
  leakage: {
    enabled: false,
    ratePerS: 0.0005,
  },
};

const closedPumpedPhysics: HeatCapacityFreePhysicsState = {
  ...createDefaultFreePhysicsState(physicsConfig),
  gasAmountRatio: 1.1,
  maxPressureKPa: 112,
  pumpStrokeCount: 5,
  lastStopcockOpenedAtS: 1,
  lastStopcockClosedAtS: 1.5,
};

const zeroOpenPhysics: HeatCapacityFreePhysicsState = {
  ...createDefaultFreePhysicsState(physicsConfig),
  lastStopcockOpenedAtS: 1,
  lastStopcockClosedAtS: null,
};

const recoveredPhysics: HeatCapacityFreePhysicsState = {
  ...closedPumpedPhysics,
  releaseStarted: true,
  releaseReference: {
    pressureBeforeKPa: 112,
    temperatureBeforeK: 298.15,
    amountBeforeRatio: 1.1,
    openedAtS: 10,
    reachedAmbientAtS: 10.1,
  },
  lastStopcockOpenedAtS: 10,
  lastStopcockClosedAtS: 10.2,
};

const display = {
  displayPressureMv: 112.02,
  displayTemperatureMv: 1499.05,
  pressureSlopeMvPerS: 0.01,
  temperatureSlopeMvPerS: 0.02,
};

const createTrialWithU0 = (): HeatCapacityFreeTrial => ({
  ...createHeatCapacityFreeTrial('free-trial-1'),
  automaticU0,
});

const u0Input: HeatCapacityFreeRecordInput = {
  atS: 3,
  displayPressureMv: 0.02,
  displayTemperatureMv: 1499,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
};

const truncatedRecord = normalizeHeatCapacityFreeRecordInput({
  atS: 3.5,
  displayPressureMv: -0.19,
  displayTemperatureMv: 1499.19,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});
assert.equal(truncatedRecord.displayPressureMv, -0.1, 'Free records should truncate mV toward zero at one decimal place');
assert.equal(truncatedRecord.displayTemperatureMv, 1499.1, 'Free temperature records should use the same one-decimal instrument reading');

const automaticOnlyTrial = createTrialWithU0();
assert.deepEqual(
  evaluateFreeU1Record(
    automaticOnlyTrial,
    { ...calibration, automaticU0 },
    display,
    closedPumpedPhysics,
    recordConfig,
  ),
  {
    ready: false,
    reason: 'missing-u0',
  },
  'automatic U0 must not unlock official U1 recording',
);

assert.deepEqual(
  evaluateFreeU0Record(
    createHeatCapacityFreeTrial('free-trial-u0', automaticU0),
    { ...calibration, automaticU0 },
    {
      displayPressureMv: 0.02,
      displayTemperatureMv: 1499,
      pressureSlopeMvPerS: 0.01,
      temperatureSlopeMvPerS: 0.02,
    },
    zeroOpenPhysics,
    recordConfig,
  ),
  {
    ready: true,
    reason: 'ready',
  },
);

assert.deepEqual(
  evaluateFreeU0Record(
    createHeatCapacityFreeTrial('free-trial-no-zero-event', automaticU0),
    { ...calibration, zeroEvents: [], automaticU0 },
    {
      displayPressureMv: 0.02,
      displayTemperatureMv: 1499,
      pressureSlopeMvPerS: 0.01,
      temperatureSlopeMvPerS: 0.02,
    },
    zeroOpenPhysics,
    recordConfig,
  ),
  {
    ready: false,
    reason: 'zero-not-ready',
  },
  'manual U0 must require a prior zero event instead of creating one implicitly',
);

const createTrialWithManualU0 = (): HeatCapacityFreeTrial => {
  const result = recordFreeU0(createTrialWithU0(), u0Input);
  assert.equal(result.accepted, true);
  assert.equal(result.reason, 'accepted');
  assert.equal(result.trial.u0?.displayPressureMv, 0);
  assert.equal(result.trial.automaticU0, automaticU0, 'automatic U0 should stay as an advisory candidate');
  return result.trial;
};

const u1Ready = evaluateFreeU1Record(
  createTrialWithManualU0(),
  { ...calibration, automaticU0 },
  display,
  closedPumpedPhysics,
  recordConfig,
);
assert.deepEqual(u1Ready, {
  ready: true,
  reason: 'ready',
});

const u1Input: HeatCapacityFreeRecordInput = {
  atS: 20,
  displayPressureMv: display.displayPressureMv,
  displayTemperatureMv: display.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
};
const recordedU1 = recordFreeU1(createTrialWithManualU0(), u1Input);
assert.equal(recordedU1.accepted, true);
assert.equal(recordedU1.reason, 'accepted');
assert.equal(recordedU1.trial.u0?.source, 'user');
assert.equal(recordedU1.trial.u0?.phaseAtRecord, null);
assert.equal(recordedU1.trial.u0?.traceTrialId, null);
assert.equal(recordedU1.trial.u0?.traceBranchId, null);
assert.equal(recordedU1.trial.u0?.traceSampleId, null);
assert.equal(recordedU1.trial.u0?.eventId, null);
assert.equal(recordedU1.trial.u1?.displayPressureMv, 112);
assert.equal(recordedU1.trial.u1?.displayTemperatureMv, 1499);
assert.equal(recordedU1.trial.u1?.source, 'user');
assert.equal(recordedU1.trial.u1?.phaseAtRecord, null);
assert.equal(recordedU1.trial.u1?.traceTrialId, null);
assert.equal(recordedU1.trial.u1?.traceBranchId, null);
assert.equal(recordedU1.trial.u1?.traceSampleId, null);
assert.equal(recordedU1.trial.u1?.eventId, null);

const changedCalibration = {
  ...calibration,
  calibrationVersion: 2,
  zeroOffsetMv: -0.12,
};
assert.deepEqual(
  evaluateFreeU1Record(createTrialWithManualU0(), changedCalibration, display, closedPumpedPhysics, recordConfig),
  {
    ready: false,
    reason: 'calibration-changed',
  },
);
assert.deepEqual(
  evaluateFreeU2Record(recordedU1.trial, changedCalibration, display, recoveredPhysics, recordConfig),
  {
    ready: false,
    reason: 'calibration-changed',
  },
);

assert.deepEqual(
  evaluateFreeU1Record(createTrialWithManualU0(), { ...calibration, automaticU0 }, {
    ...display,
    pressureSlopeMvPerS: 0.4,
  }, closedPumpedPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U1 recording should allow unstable pressure so poor timing remains recordable',
);
assert.deepEqual(
  evaluateFreeU1Record(createTrialWithManualU0(), { ...calibration, automaticU0 }, {
    ...display,
    temperatureSlopeMvPerS: 0.5,
  }, closedPumpedPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U1 recording should allow unstable temperature so poor timing remains recordable',
);

assert.deepEqual(
  evaluateFreeU1Record(createHeatCapacityFreeTrial('missing-u0'), { ...calibration, automaticU0: null }, display, closedPumpedPhysics, recordConfig),
  {
    ready: false,
    reason: 'missing-u0',
  },
);
assert.deepEqual(
  evaluateFreeU1Record(createTrialWithManualU0(), { ...calibration, automaticU0 }, {
    ...display,
    displayPressureMv: 265,
  }, closedPumpedPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U1 recording should not be blocked only because the pressure is already above the alarm line',
);
assert.deepEqual(
  evaluateFreeU1Record(createTrialWithManualU0(), { ...calibration, automaticU0 }, {
    ...display,
    displayPressureMv: 15,
  }, closedPumpedPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U1 recording should allow insufficient pressure so weak pumping remains recordable',
);

const u2Display = {
  displayPressureMv: 31.40745176010076,
  displayTemperatureMv: 1499.02,
  pressureSlopeMvPerS: 0.01,
  temperatureSlopeMvPerS: 0.02,
};
assert.deepEqual(
  evaluateFreeU2Record(recordedU1.trial, { ...calibration, automaticU0 }, u2Display, recoveredPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
);
const overAlarmRecordedU1 = recordFreeU1(createTrialWithManualU0(), {
  ...u1Input,
  displayPressureMv: 300,
});
assert.equal(overAlarmRecordedU1.accepted, true);
assert.deepEqual(
  evaluateFreeU2Record(overAlarmRecordedU1.trial, { ...calibration, automaticU0 }, {
    ...u2Display,
    displayPressureMv: 265,
  }, recoveredPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U2 recording should also ignore alarm state and rely on sequence and stability checks',
);
const recordedU2 = recordFreeU2(recordedU1.trial, {
  atS: 42,
  displayPressureMv: u2Display.displayPressureMv,
  displayTemperatureMv: u2Display.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
}, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
});
assert.equal(recordedU2.accepted, true);
assert.equal(recordedU2.trial.u2?.displayPressureMv, 31.4);
assert.equal(recordedU2.trial.u2?.source, 'user');
assert.equal(recordedU2.trial.u2?.phaseAtRecord, null);
assert.equal(recordedU2.trial.u2?.traceTrialId, null);
assert.equal(recordedU2.trial.u2?.traceBranchId, null);
assert.equal(recordedU2.trial.u2?.traceSampleId, null);
assert.equal(recordedU2.trial.u2?.eventId, null);
assert.equal(recordedU2.trial.correctedSignals?.U1CorrectedMv, 112);
assert.equal(recordedU2.trial.correctedSignals?.U2CorrectedMv, 31.4);
assert.equal(recordedU2.trial.correctedSignals?.gamma, 1.400222);
assert.equal(recordedU2.trial.correctedSignals?.calculationVersion, 'log-pressure-v1');
assert.equal(recordedU2.trial.correctedSignals?.atmosphericPressureKPa, 101.3);
assert.equal(recordedU2.trial.correctedSignals?.pressureSensitivityMvPerKPa, 20);

const overwrittenU1 = recordFreeU1(recordedU2.trial, {
  ...u1Input,
  atS: 41,
  displayPressureMv: 113.86,
});
assert.equal(overwrittenU1.accepted, true);
assert.equal(overwrittenU1.trial.u1?.displayPressureMv, 113.8);
assert.equal(overwrittenU1.trial.u2, null, 'overwriting U1 should clear the dependent U2 record');
assert.equal(overwrittenU1.trial.correctedSignals, null);

const overwrittenU2 = recordFreeU2(recordedU2.trial, {
  atS: 44,
  displayPressureMv: 29.92,
  displayTemperatureMv: u2Display.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
}, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
});
assert.equal(overwrittenU2.accepted, true);
assert.equal(overwrittenU2.trial.u2?.displayPressureMv, 29.9);
assert.equal(
  overwrittenU2.trial.correctedSignals?.U2CorrectedMv,
  29.9,
  'overwriting U2 should recalculate the corrected U2 value',
);
assert.notEqual(
  overwrittenU2.trial.correctedSignals?.gamma,
  recordedU2.trial.correctedSignals?.gamma,
  'overwriting U2 should recalculate gamma from the new value',
);

const differentAutomaticCandidate = {
  ...automaticU0!,
  displayPressureMv: 5,
};
const manualU0WithDifferentAutomatic = recordFreeU0(
  createHeatCapacityFreeTrial('manual-u0-source-check', differentAutomaticCandidate),
  u0Input,
);
assert.equal(manualU0WithDifferentAutomatic.accepted, true);
const sourceCheckU1 = recordFreeU1(manualU0WithDifferentAutomatic.trial, u1Input);
assert.equal(sourceCheckU1.accepted, true);
const sourceCheckU2 = recordFreeU2(sourceCheckU1.trial, {
  atS: 42,
  displayPressureMv: u2Display.displayPressureMv,
  displayTemperatureMv: u2Display.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});
assert.equal(sourceCheckU2.accepted, true);
assert.equal(sourceCheckU2.trial.correctedSignals?.U0DisplayMv, 0);
assert.equal(sourceCheckU2.trial.correctedSignals?.U1CorrectedMv, 112);
assert.equal(
  sourceCheckU2.trial.correctedSignals?.U1CorrectedMv,
  sourceCheckU1.trial.u1!.displayPressureMv - manualU0WithDifferentAutomatic.trial.u0!.displayPressureMv,
  'official Free correction must use user-clicked U0 instead of the automatic advisory candidate',
);

assert.deepEqual(
  evaluateFreeU2Record(recordedU1.trial, { ...calibration, automaticU0 }, u2Display, closedPumpedPhysics, recordConfig),
  {
    ready: false,
    reason: 'release-not-started',
  },
);
assert.deepEqual(
  evaluateFreeU2Record(createTrialWithManualU0(), { ...calibration, automaticU0 }, u2Display, recoveredPhysics, recordConfig),
  {
    ready: false,
    reason: 'invalid-sequence',
  },
);
assert.deepEqual(
  evaluateFreeU2Record(recordedU1.trial, { ...calibration, automaticU0 }, {
    ...u2Display,
    displayPressureMv: 0.12,
  }, recoveredPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U2 recording should allow over-vented values so extreme operation remains recordable',
);

assert.deepEqual(
  evaluateFreeU2Record(recordedU1.trial, { ...calibration, automaticU0 }, {
    ...u2Display,
    displayPressureMv: 130,
  }, recoveredPhysics, recordConfig),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U2 recording should allow U2 above U1 so invalid results can be diagnosed later',
);

const invalidRawU2 = recordFreeU2(recordedU1.trial, {
  atS: 43,
  displayPressureMv: 130,
  displayTemperatureMv: u2Display.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
}, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
});
assert.equal(invalidRawU2.accepted, true, 'raw invalid U2 records should be accepted');
assert.equal(invalidRawU2.trial.u2?.displayPressureMv, 130);
assert.equal(invalidRawU2.trial.correctedSignals, null, 'invalid gamma math should be deferred to processing diagnostics');

const freeProcessing = calculateFreeHeatCapacityMeanResult([recordedU2.trial], {
  theoreticalGamma: 1.4,
});
assert.equal(freeProcessing.status, 'ready');
assert.equal(freeProcessing.validTrialCount, 1);
assert.equal(freeProcessing.trialResults[0].U0DisplayMv, 0);
assert.equal(freeProcessing.trialResults[0].U1DisplayMv, 112);
assert.equal(freeProcessing.trialResults[0].U2DisplayMv, 31.4);
assert.equal(freeProcessing.trialResults[0].U1CorrectedMv, 112);
assert.equal(freeProcessing.trialResults[0].U2CorrectedMv, 31.4);
assert.equal(freeProcessing.trialResults[0].gamma, 1.400222);
assert.equal(freeProcessing.meanGamma, 1.400222);

const freeRemovalU2 = removeHeatCapacityFreeTrialRecord([recordedU2.trial], 0, 'u2').trials[0];
assert.notEqual(freeRemovalU2.u0, null);
assert.notEqual(freeRemovalU2.u1, null);
assert.equal(freeRemovalU2.u2, null);
assert.equal(freeRemovalU2.correctedSignals, null, 'removing Free U2 should invalidate calculated gamma');

const freeRemovalU1 = removeHeatCapacityFreeTrialRecord([recordedU2.trial], 0, 'u1').trials[0];
assert.notEqual(freeRemovalU1.u0, null);
assert.equal(freeRemovalU1.u1, null);
assert.equal(freeRemovalU1.u2, null);
assert.equal(freeRemovalU1.correctedSignals, null, 'removing Free U1 should also clear dependent U2');

const freeRemovalU0 = removeHeatCapacityFreeTrialRecord([recordedU2.trial], 0, 'u0').trials[0];
assert.equal(freeRemovalU0.u0, null);
assert.equal(freeRemovalU0.u1, null);
assert.equal(freeRemovalU0.u2, null);
assert.equal(freeRemovalU0.correctedSignals, null, 'removing Free U0 should clear all official values that depend on it');

const freeRemovalTrial = removeHeatCapacityFreeTrialRecord([recordedU2.trial], 0, 'trial');
assert.equal(freeRemovalTrial.trials.length, 0, 'removing a Free trial should delete the whole group row');
assert.equal(freeRemovalTrial.nextActiveTrialIndex, 0);

const teachingResult = calculateHeatCapacityMeanResult([
  {
    ...createHeatCapacityTrial(1),
    U1Mv: 120,
    U2Mv: 34.3,
    UT1Mv: 1526.1,
    UT2Mv: 1522.3,
    status: 'complete',
  },
], {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});
assert.equal(teachingResult.status, 'ready');
assert.equal(teachingResult.trialResults[0].deltaP1KPa, 6);
assert.equal(teachingResult.trialResults[0].deltaP2KPa, 1.715);

const version1PhysicsConfig: HeatCapacityFreePhysicsConfig = {
  environment: {
    ambientTemperatureK: 298.15,
    ambientPressureKPa: 101.3,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.018,
  pumpPressureLimitKPa: 108.3,
  stopcockFlowRate: 4,
  thermal: {
    gasWallConductanceWPerK: 0.55,
    wallAmbientConductanceWPerK: 1.6,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
  leakage: {
    enabled: false,
    ratePerS: 0.0005,
  },
};

const version1SensorConfig: HeatCapacityFreeSensorConfig = {
  pressureMvPerKPa: 20,
  temperatureMvAtAmbient: 1499,
  temperatureMvPerK: 2,
  lagRate: 8,
  noiseMv: 0,
  quantizationMv: 0.01,
  minSampleIntervalS: 0.1,
  maxSampleIntervalS: 0.1,
  historyWindowS: 1.2,
};

const version1RecordConfig: HeatCapacityFreeRecordConfig = {
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: 120,
};

const makeAutomaticCalibration = () => {
  let state: HeatCapacityFreeCalibrationState = {
    calibrationVersion: 0,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  };
  state = applyFreeZeroCalibration(state, {
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: version1SensorConfig.temperatureMvAtAmbient,
    zeroOffsetMv: 0,
    source: 'user',
  });
  state = captureAutomaticU0IfReady(state, {
    atS: 0.1,
    powerOn: true,
    stopcockOpen: true,
    zeroed: true,
    zeroEventId: 'zero-1',
    pressureStable: true,
    temperatureStable: true,
    displayPressureMv: 0,
    displayTemperatureMv: version1SensorConfig.temperatureMvAtAmbient,
  });
  assert.notEqual(state.automaticU0, null, 'scripted Free sequence should start from an automatic U0');
  return state;
};

interface ScriptedFreeRun {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
  calibration: HeatCapacityFreeCalibrationState;
}

const displayFromRun = (run: ScriptedFreeRun) => getFreeSensorDisplay(
  run.sensor,
  run.calibration,
  version1SensorConfig,
);

const stepScriptedRun = (
  run: ScriptedFreeRun,
  controls: HeatCapacityFreeControls,
  dtS: number,
) => {
  const timeS = Number((run.timeS + dtS).toFixed(6));
  const physics = stepFreePhysics(
    run.physics,
    version1PhysicsConfig,
    controls,
    dtS,
    timeS,
  );
  const derived = deriveFreePhysicalState(physics, version1PhysicsConfig);
  const sensor = stepFreeSensor(
    run.sensor,
    {
      gasPressureKPa: derived.gasPressureKPa,
      pressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: physics.gasTemperatureK,
      ambientTemperatureK: version1PhysicsConfig.environment.ambientTemperatureK,
    },
    run.calibration,
    version1SensorConfig,
    timeS,
  );
  return {
    ...run,
    timeS,
    physics,
    sensor,
  };
};

const createScriptedRun = (): ScriptedFreeRun => ({
  timeS: 0.1,
  physics: createDefaultFreePhysicsState(version1PhysicsConfig),
  sensor: createDefaultFreeSensorState('version-1-run', {
    pressureMv: 0,
    temperatureMv: version1SensorConfig.temperatureMvAtAmbient,
  }),
  calibration: makeAutomaticCalibration(),
});

const createManualU0TrialFromCalibration = (
  id: string,
  calibrationState: HeatCapacityFreeCalibrationState,
) => {
  const automaticCandidate = calibrationState.automaticU0;
  assert.notEqual(automaticCandidate, null, 'manual U0 fixture requires an advisory automatic candidate');
  const result = recordFreeU0(createHeatCapacityFreeTrial(id, automaticCandidate), {
    atS: automaticCandidate!.atS,
    displayPressureMv: automaticCandidate!.displayPressureMv,
    displayTemperatureMv: automaticCandidate!.displayTemperatureMv,
    calibrationVersion: automaticCandidate!.calibrationVersion,
    zeroEventId: automaticCandidate!.zeroEventId,
  });
  assert.equal(result.accepted, true);
  return result.trial;
};

const waitForRecordStable = (
  run: ScriptedFreeRun,
  controls: HeatCapacityFreeControls,
  seconds = 40,
) => {
  let current = run;
  for (let index = 0; index < seconds * 10; index += 1) {
    current = stepScriptedRun(current, controls, 0.1);
  }
  return current;
};

const pumpScriptedRun = (
  run: ScriptedFreeRun,
  strokes: number,
) => {
  let current = run;
  for (let index = 0; index < strokes; index += 1) {
    current = stepScriptedRun(current, {
      powerOn: true,
      pumpValveOpen: true,
      stopcockOpen: false,
    }, 0.1);
    const pump = applyFreePumpStroke(
      current.physics,
      version1PhysicsConfig,
      {
        powerOn: true,
        pumpValveOpen: true,
        stopcockOpen: false,
      },
      {
        atS: current.timeS,
        strength: 1,
      },
    );
    assert.equal(pump.accepted, true, 'scripted pump stroke should be accepted below the danger threshold');
    current = {
      ...current,
      physics: pump.state,
    };
  }
  return waitForRecordStable(current, {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  });
};

const createGoodOperationU1 = () => {
  const pumpedRun = pumpScriptedRun(createScriptedRun(), 3);
  const trial = createManualU0TrialFromCalibration('excellent', pumpedRun.calibration);
  const u1Evaluation = evaluateFreeU1Record(
    trial,
    pumpedRun.calibration,
    displayFromRun(pumpedRun),
    pumpedRun.physics,
    version1RecordConfig,
  );
  assert.deepEqual(u1Evaluation, {
    ready: true,
    reason: 'ready',
  });
  const u1Record = recordFreeU1(trial, {
    atS: pumpedRun.timeS,
    displayPressureMv: pumpedRun.sensor.displayPressureMv,
    displayTemperatureMv: pumpedRun.sensor.displayTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  });
  assert.equal(u1Record.accepted, true);
  return {
    run: pumpedRun,
    trial: u1Record.trial,
  };
};

const recoverAfterRelease = (
  pumpedRun: ScriptedFreeRun,
  openDurationS: number,
) => {
  let current = stepScriptedRun(pumpedRun, {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: true,
    stopcockFlowPurpose: 'release',
  }, 0.05);
  const totalOpenDurationS = 0.2 + openDurationS;
  for (let elapsed = 0; elapsed < totalOpenDurationS; elapsed += 0.1) {
    current = stepScriptedRun(current, {
      powerOn: true,
      pumpValveOpen: false,
      stopcockOpen: true,
      stopcockFlowPurpose: 'release',
    }, 0.1);
  }
  current = stepScriptedRun(current, {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  }, 0.05);
  return waitForRecordStable(current, {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  });
};

const excellentU1 = createGoodOperationU1();
const excellentRecovered = recoverAfterRelease(excellentU1.run, 0);
const excellentU2Evaluation = evaluateFreeU2Record(
  excellentU1.trial,
  excellentRecovered.calibration,
  displayFromRun(excellentRecovered),
  excellentRecovered.physics,
  version1RecordConfig,
);
assert.deepEqual(excellentU2Evaluation, {
  ready: true,
  reason: 'ready',
});
const excellentU2 = recordFreeU2(excellentU1.trial, {
  atS: excellentRecovered.timeS,
  displayPressureMv: excellentRecovered.sensor.displayPressureMv,
  displayTemperatureMv: excellentRecovered.sensor.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});
assert.equal(excellentU2.accepted, true);
assert.equal(
  excellentU2.trial.correctedSignals!.U1CorrectedMv >= 105 &&
    excellentU2.trial.correctedSignals!.U1CorrectedMv <= 130,
  true,
  'excellent Free operation should record U1 in the version-1 target range',
);
assert.equal(
  excellentU2.trial.correctedSignals!.U2CorrectedMv > 24 &&
    excellentU2.trial.correctedSignals!.U2CorrectedMv < 33 &&
    excellentU2.trial.correctedSignals!.U2CorrectedMv < excellentU2.trial.correctedSignals!.U1CorrectedMv,
  true,
  'excellent Free operation should record a positive model-generated U2 below U1 without locking U2 to the old adiabatic shortcut',
);
assert.equal(
  excellentU2.trial.correctedSignals!.gamma > 1.35 &&
    excellentU2.trial.correctedSignals!.gamma < 1.45,
  true,
  'excellent Free operation should produce a plausible gamma',
);

const slowCloseU1 = createGoodOperationU1();
const slowCloseRecovered = recoverAfterRelease(slowCloseU1.run, 0.7);
const slowCloseU2 = recordFreeU2(slowCloseU1.trial, {
  atS: slowCloseRecovered.timeS,
  displayPressureMv: slowCloseRecovered.sensor.displayPressureMv,
  displayTemperatureMv: slowCloseRecovered.sensor.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});
assert.equal(slowCloseU2.accepted, true);
assert.equal(
  slowCloseU2.trial.correctedSignals!.U2CorrectedMv < excellentU2.trial.correctedSignals!.U2CorrectedMv,
  true,
  'slow close after release should reduce U2 relative to excellent operation',
);

const longOpenU1 = createGoodOperationU1();
const longOpenRecovered = recoverAfterRelease(longOpenU1.run, 6);
const longOpenEvaluation = evaluateFreeU2Record(
  longOpenU1.trial,
  longOpenRecovered.calibration,
  displayFromRun(longOpenRecovered),
  longOpenRecovered.physics,
  version1RecordConfig,
);
assert.equal(
  longOpenEvaluation.ready,
  true,
  'long-open Free operation may stabilize again under the wall-exchange model',
);
const longOpenU2 = recordFreeU2(longOpenU1.trial, {
  atS: longOpenRecovered.timeS,
  displayPressureMv: longOpenRecovered.sensor.displayPressureMv,
  displayTemperatureMv: longOpenRecovered.sensor.displayTemperatureMv,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});
assert.equal(longOpenU2.accepted, true);
assert.equal(
  longOpenU2.trial.correctedSignals!.gamma < slowCloseU2.trial.correctedSignals!.gamma,
  true,
  'long-open Free operation should remain recordable but degrade the calculated gamma',
);

const insufficientRun = pumpScriptedRun(createScriptedRun(), 1);
assert.deepEqual(
  evaluateFreeU1Record(
    createManualU0TrialFromCalibration('insufficient', insufficientRun.calibration),
    insufficientRun.calibration,
    displayFromRun(insufficientRun),
    insufficientRun.physics,
    version1RecordConfig,
  ),
  {
    ready: true,
    reason: 'ready',
  },
  'insufficient pumping should stay recordable for later diagnosis',
);

const badRezeroBase = createGoodOperationU1();
const badRezeroCalibration = applyFreeZeroCalibration(badRezeroBase.run.calibration, {
  atS: badRezeroBase.run.timeS + 0.1,
  displayPressureMv: 0.42,
  displayTemperatureMv: version1SensorConfig.temperatureMvAtAmbient,
  zeroOffsetMv: 0.42,
  source: 'user',
});
assert.deepEqual(
  evaluateFreeU2Record(
    badRezeroBase.trial,
    badRezeroCalibration,
    displayFromRun(badRezeroBase.run),
    badRezeroBase.run.physics,
    version1RecordConfig,
  ),
  {
    ready: false,
    reason: 'calibration-changed',
  },
);

assert.deepEqual(
  evaluateFreeU1Record(
    createManualU0TrialFromCalibration('danger', excellentRecovered.calibration),
    excellentRecovered.calibration,
    {
      ...displayFromRun(excellentRecovered),
      displayPressureMv: 121,
      pressureSlopeMvPerS: 0,
      temperatureSlopeMvPerS: 0,
    },
    {
      ...excellentRecovered.physics,
      pumpStrokeCount: 4,
    },
    version1RecordConfig,
  ),
  {
    ready: true,
    reason: 'ready',
  },
  'Free U1 recording should remain available after a stable over-alarm pressure has already been produced',
);

console.log('heatCapacityFreeRecordModel tests passed');
