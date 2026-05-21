import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
  createDefaultHeatCapacityFile,
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';

const recordConfig = {
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: 120,
};

const createStableFreeU1File = (): WorkbenchHeatCapacityState => {
  const base = createDefaultHeatCapacityFile(1);
  const u0 = normalizeHeatCapacityFreeRecordInput({
    atS: 8,
    displayPressureMv: 0.02,
    displayTemperatureMv: 1499.02,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  });
  return {
    ...base,
    heatCapacityMode: 'free',
    powerOn: true,
    heatCapacityPhase: 'sealedStabilizing',
    pressureZeroed: true,
    pressureZeroAdjusted: true,
    stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
    glassPistonState: 'closed',
    pumpStrokeCount: 9,
    pressureSafetyStatus: 'normal',
    heatCapacityFreeStopcockFlowOpen: false,
    heatCapacityFreeStopcockPendingOpenAtMs: null,
    heatCapacityFreePhysicsState: {
      ...base.heatCapacityFreePhysicsState,
      simulationTimeS: 60,
      pumpStrokeCount: 9,
      lastStopcockOpenedAtS: 2,
      lastStopcockClosedAtS: 12,
      releaseStarted: false,
      releaseReference: null,
    },
    heatCapacityFreeSensorState: {
      ...base.heatCapacityFreeSensorState,
      displayPressureMv: 91.17,
      displayTemperatureMv: 1499.02,
      pressureSlopeMvPerS: 0.01,
      temperatureSlopeMvPerS: 0.01,
    },
    heatCapacityFreeCalibrationState: {
      ...base.heatCapacityFreeCalibrationState,
      calibrationVersion: 1,
      zeroOffsetMv: 0,
      zeroEvents: [{
        id: 'zero-1',
        atS: 7.5,
        displayPressureMv: 0.02,
        displayTemperatureMv: 1499.02,
        zeroOffsetMv: 0,
        source: 'user',
      }],
      automaticU0: null,
    },
    heatCapacityFreeTrials: [{
      ...createHeatCapacityFreeTrial('free-trial-1'),
      u0,
    }],
  };
};

const u1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createStableFreeU1File(),
  'u1',
  recordConfig,
  20_000,
);

assert.equal(u1Attempt.accepted, true);
assert.equal(u1Attempt.reason, 'accepted');
assert.equal(u1Attempt.trialIndex, 0);
assert.equal(u1Attempt.file.heatCapacityFreeTrials.length, 1);
assert.equal(u1Attempt.file.heatCapacityFreeTrials[0].u0?.zeroEventId, 'zero-1');
assert.equal(u1Attempt.file.heatCapacityFreeTrials[0].u1?.displayPressureMv, 91.17);
assert.equal(u1Attempt.file.heatCapacityFreeTrials[0].u1?.zeroEventId, 'zero-1');
assert.equal(
  u1Attempt.file.heatCapacityFreeTraceStore.traceTrials.length,
  1,
  'accepted U1 should attach a trace event without requiring React updater side effects',
);

console.log('workbenchHeatCapacityFreeRecordAttempt tests passed');
