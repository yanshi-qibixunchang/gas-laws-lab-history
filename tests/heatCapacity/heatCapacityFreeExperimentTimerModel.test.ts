import assert from 'node:assert/strict';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  stepFreePhysics,
  type HeatCapacityFreePhysicsConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  deriveHeatCapacityFreeExperimentTimer,
  HEAT_CAPACITY_FREE_TARGET_WAIT_S,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentTimerModel.ts';
import {
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';

const config: HeatCapacityFreePhysicsConfig = {
  environment: {
    ambientTemperatureK: 298.15,
    ambientPressureKPa: 101.3,
  },
  vesselVolumeL: 2,
  gamma: 1.4,
  pumpAmountGainRatio: 0.015,
  pumpPressureLimitKPa: 300,
  pumpInflowTemperatureRiseK: 42,
  stopcockFlowRate: 4,
  thermal: {
    gasWallConductanceWPerK: 0.22,
    wallAmbientConductanceWPerK: 0.45,
    wallHeatCapacityJPerK: 45,
    minimumGasHeatCapacityJPerK: 0.1,
  },
  leakage: {
    enabled: false,
    ratePerS: 0.0005,
  },
};

const controls = {
  powerOn: true,
  pumpValveOpen: false,
  stopcockOpen: false,
};

const recordAt = (atS: number, displayPressureMv: number) => normalizeHeatCapacityFreeRecordInput({
  atS,
  displayPressureMv,
  displayTemperatureMv: 1499,
  calibrationVersion: 1,
  zeroEventId: 'zero-1',
});

const trialWithU0 = {
  ...createHeatCapacityFreeTrial('timer-trial'),
  u0: recordAt(0, 0),
};

const pump = applyFreePumpStroke(
  createDefaultFreePhysicsState(config),
  config,
  {
    ...controls,
    pumpValveOpen: true,
  },
  {
    atS: 12,
    strength: 1,
  },
);
assert.equal(pump.accepted, true);
assert.equal(pump.state.lastPumpStrokeAtS, 12);

const afterEightSecondU1Wait = stepFreePhysics(
  pump.state,
  config,
  controls,
  8,
  20,
);
const u1Timer = deriveHeatCapacityFreeExperimentTimer(trialWithU0, afterEightSecondU1Wait);
assert.deepEqual(u1Timer, {
  stage: 'u1-wait',
  anchorAtS: 12,
  elapsedS: 8,
  targetS: HEAT_CAPACITY_FREE_TARGET_WAIT_S,
  remainingS: HEAT_CAPACITY_FREE_TARGET_WAIT_S - 8,
  reachedTarget: false,
});

const afterTargetU1Wait = stepFreePhysics(
  pump.state,
  config,
  controls,
  305,
  317,
);
const reachedU1Timer = deriveHeatCapacityFreeExperimentTimer(trialWithU0, afterTargetU1Wait);
assert.equal(reachedU1Timer.stage, 'u1-wait');
assert.equal(reachedU1Timer.elapsedS, 305);
assert.equal(reachedU1Timer.remainingS, 0);
assert.equal(reachedU1Timer.reachedTarget, true);

const trialWithU1 = {
  ...trialWithU0,
  u1: recordAt(317, 120),
};
const recordedU1Timer = deriveHeatCapacityFreeExperimentTimer(trialWithU1, afterTargetU1Wait);
assert.equal(
  recordedU1Timer.stage,
  'u1-wait',
  'recording U1 should not hide the timer before the user starts release',
);
const releasedButStillOpen = {
  ...afterTargetU1Wait,
  releaseStarted: true,
  releaseReference: {
    pressureBeforeKPa: 107,
    temperatureBeforeK: 298.15,
    amountBeforeRatio: 1.06,
    openedAtS: 320,
    reachedAmbientAtS: 320.2,
  },
  lastStopcockOpenedAtS: 320,
  lastStopcockClosedAtS: null,
  simulationTimeS: 322,
};
assert.equal(
  deriveHeatCapacityFreeExperimentTimer(trialWithU1, releasedButStillOpen).stage,
  'idle',
  'U2 recovery timer should start after the stopcock is closed, not while release is still open',
);

const afterU2RecoveryWait = {
  ...releasedButStillOpen,
  lastStopcockClosedAtS: 320.3,
  simulationTimeS: 620.3,
};
const u2Timer = deriveHeatCapacityFreeExperimentTimer(trialWithU1, afterU2RecoveryWait);
assert.deepEqual(u2Timer, {
  stage: 'u2-wait',
  anchorAtS: 320.3,
  elapsedS: 300,
  targetS: HEAT_CAPACITY_FREE_TARGET_WAIT_S,
  remainingS: 0,
  reachedTarget: true,
});

const recordedU2Timer = deriveHeatCapacityFreeExperimentTimer({
  ...trialWithU1,
  u2: recordAt(621, 34),
}, afterU2RecoveryWait);
assert.deepEqual(recordedU2Timer, {
  stage: 'u2-wait',
  anchorAtS: 320.3,
  elapsedS: 300,
  targetS: HEAT_CAPACITY_FREE_TARGET_WAIT_S,
  remainingS: 0,
  reachedTarget: true,
}, 'recording U2 should not hide the timer while U2 is still re-recordable');

console.log('heatCapacityFreeExperimentTimerModel tests passed');
