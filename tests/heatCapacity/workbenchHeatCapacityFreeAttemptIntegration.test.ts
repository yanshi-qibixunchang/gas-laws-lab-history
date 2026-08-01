import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
  completeHeatCapacityFreePreheatWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  deriveHeatCapacityFreeWorkbenchAttemptWaitTimer,
  evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState,
  getHeatCapacityFreeRecordButtonState,
  isHeatCapacityFreePreheatRequired,
  powerHeatCapacityWorkbenchFile,
  registerHeatCapacityPumpStroke,
  resetHeatCapacityFreeRunWorkbenchState,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  setHeatCapacityPressureZeroOffset,
  stepHeatCapacityWorkbenchFile,
} from '../../src/features/workbench/workbenchState.ts';

// Physical state and calibration exist independently of observation power.
const fresh = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(41),
  3,
  1,
);
let harmlessPrePowerOperation = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(42),
  3,
  1,
);
harmlessPrePowerOperation = setHeatCapacityFreeStopcockOpen(harmlessPrePowerOperation, true, 100);
harmlessPrePowerOperation = stepHeatCapacityWorkbenchFile(harmlessPrePowerOperation, 600);
harmlessPrePowerOperation = powerHeatCapacityWorkbenchFile(harmlessPrePowerOperation, true, 700);
assert.equal(
  isHeatCapacityFreePreheatRequired(harmlessPrePowerOperation),
  true,
  'opening the glass stopcock before the first power-on must not consume preheat eligibility',
);
const initialBias = fresh.heatCapacityFreeSensorState.pressureInitialBiasMv;
const zeroedOff = setHeatCapacityPressureZeroOffset(fresh, 0.4, 'coarseDrag', 180, 1_000);
assert.equal(zeroedOff.powerOn, false);
assert.equal(zeroedOff.heatCapacityFreeCalibrationState.zeroOffsetMv, 0.5);
assert.equal(zeroedOff.heatCapacityFreePhysicsState.gasAmountRatio, 1);

const valveOpenOff = setHeatCapacityFreePumpValveOpen(zeroedOff, true, 1_010);
const pumpedOff = registerHeatCapacityPumpStroke(valveOpenOff, 1_020);
const pumpedOffAdvanced = stepHeatCapacityWorkbenchFile(pumpedOff, 1_140);
assert.equal(pumpedOffAdvanced.powerOn, false);
assert.equal(pumpedOffAdvanced.pressureSignalMv, null);
assert.equal(pumpedOffAdvanced.temperatureSignalMv, null);
assert.ok(pumpedOffAdvanced.heatCapacityFreePhysicsState.gasAmountRatio > 1);
assert.ok(pumpedOffAdvanced.pressureDeltaKPa > 0);
assert.ok(pumpedOffAdvanced.pressureGaugeDisplayValue > 0, 'mechanical gauge must respond while power is off');
assert.equal(pumpedOffAdvanced.heatCapacityFreeActiveAttempt?.startReason, 'effective-pump');
assert.equal(pumpedOffAdvanced.heatCapacityFreeActiveAttempt?.preheatOutcome, 'omitted');
assert.equal(pumpedOffAdvanced.heatCapacityFreePreheatCompleted, false);

const poweredAfterOmission = powerHeatCapacityWorkbenchFile(pumpedOffAdvanced, true, 1_200);
assert.equal(
  isHeatCapacityFreePreheatRequired(poweredAfterOmission),
  false,
  'the current omitted-preheat group must not show the overlay after pumping first',
);

const resetOmitted = resetHeatCapacityFreeRunWorkbenchState(poweredAfterOmission, 1_300);
assert.equal(resetOmitted.heatCapacityFreeActiveAttempt, null);
assert.equal(resetOmitted.heatCapacityFreePreheatCompleted, false);
assert.equal(resetOmitted.heatCapacityFreeSensorState.pressureInitialBiasMv, initialBias);
const nextPowerOn = powerHeatCapacityWorkbenchFile(resetOmitted, true, 1_400);
assert.equal(isHeatCapacityFreePreheatRequired(nextPowerOn), true, 'pending preheat should carry to the next group');
const preheated = completeHeatCapacityFreePreheatWorkbenchState(nextPowerOn, 6_400);
assert.equal(preheated.heatCapacityFreePreheatCompleted, true);
assert.equal(isHeatCapacityFreePreheatRequired(preheated), false);

const createWaitingAttempt = () => {
  let file = resetHeatCapacityFreeRunWorkbenchState(preheated, 6_401);
  file = powerHeatCapacityWorkbenchFile(file, true, 6_402);
  file = setHeatCapacityFreePumpValveOpen(file, true, 6_403);
  file = registerHeatCapacityPumpStroke(file, 6_404);
  file = stepHeatCapacityWorkbenchFile(file, 6_524);
  return setHeatCapacityFreePumpValveOpen(file, false, 6_525);
};

const invalidByReopen = setHeatCapacityFreePumpValveOpen(createWaitingAttempt(), true, 6_530);
assert.equal(invalidByReopen.heatCapacityFreeActiveAttempt?.status, 'invalid');
assert.equal(invalidByReopen.heatCapacityFreeActiveAttempt?.invalidReason, 'reopen-pump-valve-during-u1');

const invalidByZero = setHeatCapacityPressureZeroOffset(
  createWaitingAttempt(),
  0.2,
  'coarseDrag',
  90,
  6_531,
);
assert.equal(invalidByZero.heatCapacityFreeActiveAttempt?.invalidReason, 'zero-after-effective-pump');

let invalidByEarlyRelease = setHeatCapacityFreeStopcockOpen(createWaitingAttempt(), true, 6_532);
invalidByEarlyRelease = stepHeatCapacityWorkbenchFile(invalidByEarlyRelease, 7_032);
assert.equal(invalidByEarlyRelease.heatCapacityFreeActiveAttempt?.invalidReason, 'release-before-u1');
assert.equal(getHeatCapacityFreeRecordButtonState(invalidByEarlyRelease, 'u1').visible, false);
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(invalidByEarlyRelease).stage, 'idle');

const powerOffWaiting = powerHeatCapacityWorkbenchFile(createWaitingAttempt(), false, 6_540);
const invalidByPowerOff = evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState(powerOffWaiting, 66_540);
assert.equal(invalidByPowerOff.heatCapacityFreeActiveAttempt?.invalidReason, 'power-off-timeout');

const delayedPowerToggleSource = createWaitingAttempt();
const beforeDelayedPowerToggleS = delayedPowerToggleSource.heatCapacityFreePhysicsState.simulationTimeS;
const delayedPowerToggle = powerHeatCapacityWorkbenchFile(delayedPowerToggleSource, false, 7_525);
assert.ok(
  delayedPowerToggle.heatCapacityFreePhysicsState.simulationTimeS - beforeDelayedPowerToggleS >= 7.9,
  'power toggling must step the existing physical state through the operation timestamp',
);

let acceleratedPowerOffWait = createWaitingAttempt();
acceleratedPowerOffWait = setHeatCapacityFreeEquilibriumSpeedMultiplier(acceleratedPowerOffWait, 16, 6_530);
const acceleratedStartS = acceleratedPowerOffWait.heatCapacityFreePhysicsState.simulationTimeS;
acceleratedPowerOffWait = powerHeatCapacityWorkbenchFile(acceleratedPowerOffWait, false, 6_530);
acceleratedPowerOffWait = stepHeatCapacityWorkbenchFile(acceleratedPowerOffWait, 16_530);
assert.ok(
  acceleratedPowerOffWait.heatCapacityFreePhysicsState.simulationTimeS - acceleratedStartS >= 159.9,
  'an active wait must continue at the selected multiplier while power is off',
);
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(acceleratedPowerOffWait).stage, 'u1-wait');

// Complete the normal Free flow without U0. U1/U2 remain recordable and the
// calculation must explicitly use U0 = 0 mV.
let normal = setHeatCapacityFreePumpValveOpen(preheated, true, 6_410);
normal = registerHeatCapacityPumpStroke(normal, 6_420);
normal = stepHeatCapacityWorkbenchFile(normal, 6_540);
normal = setHeatCapacityFreePumpValveOpen(normal, false, 6_550);
assert.equal(normal.heatCapacityFreeActiveAttempt?.stage, 'waiting-u1');
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(normal).stage, 'u1-wait');
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(normal, 'u1'),
  { visible: true, mode: 'record', disabledReason: null },
);

const u1 = applyHeatCapacityFreeRecordWorkbenchState(normal, 'u1', 6_560);
assert.equal(u1.accepted, true);
assert.equal(u1.file.heatCapacityFreeTrials[0]?.u0, null);
assert.notEqual(u1.file.heatCapacityFreeTrials[0]?.u1, null);

normal = setHeatCapacityFreeStopcockOpen(u1.file, true, 6_570);
normal = stepHeatCapacityWorkbenchFile(normal, 7_070);
assert.equal(normal.heatCapacityFreeActiveAttempt?.stage, 'releasing');
normal = stepHeatCapacityWorkbenchFile(normal, 7_320);
normal = setHeatCapacityFreeStopcockOpen(normal, false, 7_320);
normal = stepHeatCapacityWorkbenchFile(normal, 7_820);
assert.equal(normal.heatCapacityFreeActiveAttempt?.stage, 'waiting-u2');
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(normal).stage, 'u2-wait');

normal = setHeatCapacityFreeEquilibriumSpeedMultiplier(normal, 16, 7_830);
normal = stepHeatCapacityWorkbenchFile(normal, 27_830);
const u2 = applyHeatCapacityFreeRecordWorkbenchState(normal, 'u2', 27_840);
assert.equal(u2.accepted, true);
assert.equal(u2.file.heatCapacityFreeTrials[0]?.correctedSignals?.u0Source, 'assumed-zero');
assert.equal(u2.file.heatCapacityFreeTrials[0]?.correctedSignals?.U0DisplayMv, 0);
assert.equal(u2.file.heatCapacityFreeTrials[0]?.preheatOutcome, 'completed');

const completed = powerHeatCapacityWorkbenchFile(u2.file, false, 27_850);
assert.equal(completed.heatCapacityFreeActiveAttempt, null);
assert.notEqual(completed.heatCapacityFreeTrials[0]?.completedAtMs, null);

console.log('workbenchHeatCapacityFreeAttemptIntegration tests passed');
