import assert from 'node:assert/strict';
import { getHeatCapacityFreeRecordedTrialIssue } from '../../src/features/workbench/workbenchHeatCapacityFreeRecordState.ts';
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
const initialBias = fresh.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv;
const zeroedOff = setHeatCapacityPressureZeroOffset(fresh, 0.4, 'coarseDrag', 180, 1_000);
assert.equal(zeroedOff.powerOn, false);
assert.equal(zeroedOff.heatCapacityFreeInstrumentState.calibration.zeroOffsetMv, 0.5);
assert.equal(zeroedOff.heatCapacityFreeInstrumentState.physics.gasAmountRatio, 1);

const valveOpenOff = setHeatCapacityFreePumpValveOpen(zeroedOff, true, 1_010);
const pumpedOff = registerHeatCapacityPumpStroke(valveOpenOff, 1_020);
const pumpedOffAdvanced = stepHeatCapacityWorkbenchFile(pumpedOff, 1_140);
assert.equal(pumpedOffAdvanced.powerOn, false);
assert.equal(pumpedOffAdvanced.pressureSignalMv, null);
assert.equal(pumpedOffAdvanced.temperatureSignalMv, null);
assert.ok(pumpedOffAdvanced.heatCapacityFreeInstrumentState.physics.gasAmountRatio > 1);
assert.ok(pumpedOffAdvanced.pressureDeltaKPa > 0);
assert.ok(pumpedOffAdvanced.pressureGaugeDisplayValue > 0, 'mechanical gauge must respond while power is off');
assert.equal(pumpedOffAdvanced.heatCapacityFreeRunWorkspace.activeAttempt?.startReason, 'effective-pump');
assert.equal(pumpedOffAdvanced.heatCapacityFreeRunWorkspace.activeAttempt?.preheatOutcome, 'omitted');
assert.equal(pumpedOffAdvanced.heatCapacityFreePreheatCompleted, false);

const poweredAfterOmission = powerHeatCapacityWorkbenchFile(pumpedOffAdvanced, true, 1_200);
assert.equal(
  isHeatCapacityFreePreheatRequired(poweredAfterOmission),
  false,
  'the current omitted-preheat group must not show the overlay after pumping first',
);

const resetOmitted = resetHeatCapacityFreeRunWorkbenchState(poweredAfterOmission, 1_300);
assert.equal(resetOmitted.heatCapacityFreeRunWorkspace.activeAttempt, null);
assert.equal(resetOmitted.heatCapacityFreePreheatCompleted, false);
assert.equal(resetOmitted.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv, initialBias);
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
assert.equal(invalidByReopen.heatCapacityFreeRunWorkspace.activeAttempt?.status, 'invalid');
assert.equal(invalidByReopen.heatCapacityFreeRunWorkspace.activeAttempt?.invalidReason, 'reopen-pump-valve-during-u1');

const invalidByZero = setHeatCapacityPressureZeroOffset(
  createWaitingAttempt(),
  0.2,
  'coarseDrag',
  90,
  6_531,
);
assert.equal(invalidByZero.heatCapacityFreeRunWorkspace.activeAttempt?.invalidReason, 'zero-after-effective-pump');

let invalidByEarlyRelease = setHeatCapacityFreeStopcockOpen(createWaitingAttempt(), true, 6_532);
invalidByEarlyRelease = stepHeatCapacityWorkbenchFile(invalidByEarlyRelease, 7_032);
assert.equal(invalidByEarlyRelease.heatCapacityFreeRunWorkspace.activeAttempt?.invalidReason, 'release-before-u1');
assert.equal(getHeatCapacityFreeRecordButtonState(invalidByEarlyRelease, 'u1').visible, false);
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(invalidByEarlyRelease).stage, 'idle');

const powerOffWaiting = powerHeatCapacityWorkbenchFile(createWaitingAttempt(), false, 6_540);
const invalidByPowerOff = evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState(powerOffWaiting, 66_540);
assert.equal(invalidByPowerOff.heatCapacityFreeRunWorkspace.activeAttempt?.invalidReason, 'power-off-timeout');

const delayedPowerToggleSource = createWaitingAttempt();
const beforeDelayedPowerToggleS = delayedPowerToggleSource.heatCapacityFreeInstrumentState.physics.simulationTimeS;
const delayedPowerToggle = powerHeatCapacityWorkbenchFile(delayedPowerToggleSource, false, 7_525);
assert.ok(
  delayedPowerToggle.heatCapacityFreeInstrumentState.physics.simulationTimeS - beforeDelayedPowerToggleS >= 7.9,
  'power toggling must step the existing physical state through the operation timestamp',
);

let acceleratedPowerOffWait = createWaitingAttempt();
acceleratedPowerOffWait = setHeatCapacityFreeEquilibriumSpeedMultiplier(acceleratedPowerOffWait, 16, 6_530);
const acceleratedStartS = acceleratedPowerOffWait.heatCapacityFreeInstrumentState.physics.simulationTimeS;
acceleratedPowerOffWait = powerHeatCapacityWorkbenchFile(acceleratedPowerOffWait, false, 6_530);
acceleratedPowerOffWait = stepHeatCapacityWorkbenchFile(acceleratedPowerOffWait, 16_530);
assert.ok(
  acceleratedPowerOffWait.heatCapacityFreeInstrumentState.physics.simulationTimeS - acceleratedStartS >= 159.9,
  'an active wait must continue at the selected multiplier while power is off',
);
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(acceleratedPowerOffWait).stage, 'u1-wait');

// Raw U1/U2 remain recordable without U0, but this is not a completed trial.
// The UI must explain the missing zero rather than silently assuming zero.
let normal = setHeatCapacityFreePumpValveOpen(preheated, true, 6_410);
normal = registerHeatCapacityPumpStroke(normal, 6_420);
normal = stepHeatCapacityWorkbenchFile(normal, 6_540);
normal = setHeatCapacityFreePumpValveOpen(normal, false, 6_550);
assert.equal(normal.heatCapacityFreeRunWorkspace.activeAttempt?.stage, 'waiting-u1');
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(normal).stage, 'u1-wait');
assert.deepEqual(
  getHeatCapacityFreeRecordButtonState(normal, 'u1'),
  { visible: true, mode: 'record', disabledReason: null },
);

const u1 = applyHeatCapacityFreeRecordWorkbenchState(normal, 'u1', 6_560);
assert.equal(u1.accepted, true);
assert.equal(u1.file.heatCapacityFreeRunWorkspace.trials[0]?.u0, null);
assert.notEqual(u1.file.heatCapacityFreeRunWorkspace.trials[0]?.u1, null);

normal = setHeatCapacityFreeStopcockOpen(u1.file, true, 6_570);
normal = stepHeatCapacityWorkbenchFile(normal, 7_070);
assert.equal(normal.heatCapacityFreeRunWorkspace.activeAttempt?.stage, 'releasing');
normal = stepHeatCapacityWorkbenchFile(normal, 7_320);
normal = setHeatCapacityFreeStopcockOpen(normal, false, 7_320);
normal = stepHeatCapacityWorkbenchFile(normal, 7_820);
assert.equal(normal.heatCapacityFreeRunWorkspace.activeAttempt?.stage, 'waiting-u2');
assert.equal(deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(normal).stage, 'u2-wait');

normal = setHeatCapacityFreeEquilibriumSpeedMultiplier(normal, 16, 7_830);
normal = stepHeatCapacityWorkbenchFile(normal, 27_830);
const u2 = applyHeatCapacityFreeRecordWorkbenchState(normal, 'u2', 27_840);
assert.equal(u2.accepted, true);
assert.equal(u2.file.heatCapacityFreeRunWorkspace.trials[0]?.correctedSignals, null, 'missing manual and automatic zero records prevent calculation');
assert.equal(u2.file.heatCapacityFreeRunWorkspace.trials[0]?.preheatOutcome, 'completed');
assert.equal(getHeatCapacityFreeRecordedTrialIssue(u2.file), 'missing-zero');
assert.equal(u2.file.heatCapacityFreeRunWorkspace.currentExperimentStatus, 'running');

const completed = powerHeatCapacityWorkbenchFile(u2.file, false, 27_850);
assert.notEqual(completed.heatCapacityFreeRunWorkspace.activeAttempt, null, 'missing zero data must not finalize a valid experiment');
assert.equal(completed.heatCapacityFreeRunWorkspace.trials[0]?.completedAtMs, null);

console.log('workbenchHeatCapacityFreeAttemptIntegration tests passed');
