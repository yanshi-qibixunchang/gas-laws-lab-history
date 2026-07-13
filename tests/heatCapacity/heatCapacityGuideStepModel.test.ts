import assert from 'node:assert/strict';
import {
  getHeatCapacityGuideAllowedActions,
  getHeatCapacityGuideRollbackAnimation,
  getHeatCapacityGuideStepControlId,
  isGuideHeatCapacityPauseStep,
  isHeatCapacityGuideRecordStep,
  type GuideHeatCapacityAction,
  type GuideHeatCapacityStep,
} from '../../src/features/heatCapacity/heatCapacityGuideStepModel.ts';
import {
  getHeatCapacityGuideRollbackAnimationForControl,
  type HeatCapacityInstrumentControl,
} from '../../src/domain/heatCapacity/heatCapacityInstrumentFeedback.ts';

const allSteps: GuideHeatCapacityStep[] = [
  'idle',
  'powerOnRequired',
  'openStopcockForZeroRequired',
  'zeroAdjustRequired',
  'recordU0Required',
  'closeStopcockRequired',
  'openPumpValveRequired',
  'pumpRequired',
  'closePumpValveRequired',
  'stabilizeBeforeReleaseRequired',
  'recordU1Required',
  'openStopcockReleaseRequired',
  'closeStopcockAfterReleaseRequired',
  'recoverRequired',
  'recordU2Required',
  'closePowerRequired',
  'completed',
];

assert.equal(getHeatCapacityGuideStepControlId('powerOnRequired'), 'powerSwitch');
assert.equal(getHeatCapacityGuideStepControlId('pumpRequired'), 'pumpBulb');
assert.equal(getHeatCapacityGuideStepControlId('stabilizeBeforeReleaseRequired', { temperatureReady: false }), 'instrumentTemperatureDisplay');
assert.equal(getHeatCapacityGuideStepControlId('stabilizeBeforeReleaseRequired', { temperatureReady: true }), 'instrumentPressureDisplay');
assert.equal(getHeatCapacityGuideStepControlId('completed'), null);

assert.deepEqual(getHeatCapacityGuideAllowedActions('powerOnRequired'), ['turnPowerOn']);
assert.deepEqual(getHeatCapacityGuideAllowedActions('openStopcockForZeroRequired'), ['openStopcock']);
assert.deepEqual(getHeatCapacityGuideAllowedActions('idle'), ['turnPowerOn']);
assert.deepEqual(getHeatCapacityGuideAllowedActions('recordU0Required'), ['adjustPressureZero', 'recordU0']);
assert.deepEqual(getHeatCapacityGuideAllowedActions('pumpRequired'), ['pumpBulb']);
assert.deepEqual(getHeatCapacityGuideAllowedActions('completed'), []);

assert.equal(isHeatCapacityGuideRecordStep('recordU0Required'), true);
assert.equal(isHeatCapacityGuideRecordStep('recordU1Required'), true);
assert.equal(isHeatCapacityGuideRecordStep('pumpRequired'), false);
assert.equal(isGuideHeatCapacityPauseStep('recordU1Required'), true);
assert.equal(isGuideHeatCapacityPauseStep('closePowerRequired'), true);
assert.equal(isGuideHeatCapacityPauseStep('pumpRequired'), false);

const rollbackByAction: Partial<Record<GuideHeatCapacityAction, string>> = {
  adjustPressureZero: 'knobBounce',
  openStopcock: 'stopcockBounce',
  closeStopcock: 'stopcockBounce',
  openPumpValve: 'valveBounce',
  closePumpValve: 'valveBounce',
  pumpBulb: 'pumpBulbBounce',
  turnPowerOn: 'powerBounce',
  turnPowerOff: 'powerBounce',
};

Object.entries(rollbackByAction).forEach(([action, expected]) => {
  assert.equal(getHeatCapacityGuideRollbackAnimation(action as GuideHeatCapacityAction), expected);
});

const rollbackByControl: Record<HeatCapacityInstrumentControl, string> = {
  powerSwitch: 'powerBounce',
  pressureZero: 'knobBounce',
  stopcock: 'stopcockBounce',
  pumpValve: 'valveBounce',
  pumpBulb: 'pumpBulbBounce',
};
Object.entries(rollbackByControl).forEach(([control, expected]) => {
  assert.equal(
    getHeatCapacityGuideRollbackAnimationForControl(control as HeatCapacityInstrumentControl),
    expected,
  );
});

allSteps.forEach((step) => {
  assert.deepEqual(getHeatCapacityGuideAllowedActions(step), [...getHeatCapacityGuideAllowedActions(step)]);
});

console.log('heatCapacityGuideStepModel tests passed');
