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

const createStableOverAlarmFreeU1File = (): WorkbenchHeatCapacityState => {
  const base = createStableFreeU1File();
  return {
    ...base,
    pressureSignalMv: 151.95,
    pressureSignalMvDisplayed: 151.95,
    pressureSignalTargetMv: 151.95,
    pressureSafetyStatus: 'danger',
    pressureBlockedPumping: true,
    pressureOverLimit: true,
    heatCapacityFreeSensorState: {
      ...base.heatCapacityFreeSensorState,
      displayPressureMv: 151.95,
      pressureSlopeMvPerS: 0.01,
      temperatureSlopeMvPerS: 0.01,
    },
  };
};

const u1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createStableFreeU1File(),
  'u1',
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

const overAlarmU1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  createStableOverAlarmFreeU1File(),
  'u1',
  21_000,
);
assert.equal(
  overAlarmU1Attempt.accepted,
  true,
  'a stable over-alarm Free U1 should be recordable because the alarm only blocks further pumping',
);
assert.equal(overAlarmU1Attempt.reason, 'accepted');
assert.equal(overAlarmU1Attempt.file.heatCapacityFreeTrials[0].u1?.displayPressureMv, 151.95);

console.log('workbenchHeatCapacityFreeRecordAttempt tests passed');
