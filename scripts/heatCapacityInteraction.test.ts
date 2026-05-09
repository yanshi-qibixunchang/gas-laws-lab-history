import assert from 'node:assert/strict';
import {
  applyHeatCapacityAction,
  createHeatCapacityExperiment,
  getHeatCapacityInteractionDescriptor,
  resolveHeatCapacityPartAction,
  type HeatCapacityInstrumentPartId,
  type HeatCapacityState,
} from '../utils/heatCapacityExperiment.ts';

const clickPart = (
  state: HeatCapacityState,
  partId: HeatCapacityInstrumentPartId,
): HeatCapacityState => {
  const resolution = resolveHeatCapacityPartAction(state, partId);
  assert.equal(resolution.accepted, true, resolution.message);
  assert.ok(resolution.action, 'valid model interaction should produce an experiment action');
  return applyHeatCapacityAction(state, resolution.action);
};

const expectPrimaryPart = (
  state: HeatCapacityState,
  partId: HeatCapacityInstrumentPartId | null,
) => {
  const descriptor = getHeatCapacityInteractionDescriptor(state);
  assert.equal(descriptor.primaryPart, partId);
  if (partId) assert.ok(descriptor.validParts.includes(partId));
  assert.equal(descriptor.phase, state.phase);
  assert.ok(descriptor.instruction.length > 0);
};

let state = createHeatCapacityExperiment({ ambientPressure: 100, ambientTemperature: 1 });
let powerBlocked = resolveHeatCapacityPartAction(state, 'Hit_Pressure_Gauge');
assert.equal(powerBlocked.accepted, false);
assert.equal(powerBlocked.action, null);
assert.match(powerBlocked.message, /power|开机|Turn on/i);
let powerSwitch = resolveHeatCapacityPartAction(state, 'Instrument_Box_Power_Switch');
assert.equal(powerSwitch.accepted, true);
assert.ok(powerSwitch.action);
state = applyHeatCapacityAction(state, powerSwitch.action);
assert.equal(state.instrument.instrumentPowered, true);
expectPrimaryPart(state, 'Hit_Pressure_Gauge');
assert.ok(getHeatCapacityInteractionDescriptor(state).secondaryParts.includes('Valve_C2'));

const instrumentBoxClick = resolveHeatCapacityPartAction(state, 'Hit_Instrument_Box');
assert.equal(instrumentBoxClick.accepted, false);
assert.equal(instrumentBoxClick.action, null);
assert.equal(state.instrument.instrumentPowered, true);

let invalid = resolveHeatCapacityPartAction(state, 'Hit_Pump');
assert.equal(invalid.accepted, false);
assert.equal(invalid.action, null);
assert.match(invalid.message, /压力表/);

state = clickPart(state, 'Hit_Pressure_Gauge');
assert.equal(state.phase, 'pumping');
expectPrimaryPart(state, 'Hit_Pump');

const powerOffDuringPumping = applyHeatCapacityAction(state, { type: 'setInstrumentPower', powered: false });
const blockedPumpWhileOff = resolveHeatCapacityPartAction(powerOffDuringPumping, 'Hit_Pump');
assert.equal(blockedPumpWhileOff.accepted, false);
assert.equal(blockedPumpWhileOff.action, null);
assert.match(blockedPumpWhileOff.message, /power|开机|Turn on/i);

invalid = resolveHeatCapacityPartAction(state, 'Hit_Temperature_Display');
assert.equal(invalid.accepted, false);
assert.equal(invalid.action, null);
assert.match(invalid.message, /泵/);

state = clickPart(state, 'Hit_Pump');
assert.equal(state.phase, 'pumping');
assert.ok(state.pressure > state.ambientPressure);
const pressurizedDescriptor = getHeatCapacityInteractionDescriptor(state);
assert.equal(pressurizedDescriptor.primaryPart, 'Hit_Temperature_Display');
assert.ok(pressurizedDescriptor.validParts.includes('Hit_Pump'));
assert.ok(pressurizedDescriptor.validParts.includes('Hit_Temperature_Display'));

state = clickPart(state, 'Hit_Temperature_Display');
assert.equal(state.phase, 'stabilizingP1');
expectPrimaryPart(state, 'Hit_Temperature_Display');

state = clickPart(state, 'Hit_Temperature_Display');
assert.equal(state.phase, 'recordP1');
expectPrimaryPart(state, 'Hit_Pressure_Gauge');

state = clickPart(state, 'Hit_Pressure_Gauge');
assert.equal(state.phase, 'releasing');
expectPrimaryPart(state, 'Hit_C2');

state = clickPart(state, 'Hit_C2');
assert.equal(state.phase, 'recovering');
expectPrimaryPart(state, 'Hit_Temperature_Display');

state = clickPart(state, 'Hit_Temperature_Display');
assert.equal(state.phase, 'recordP2');
expectPrimaryPart(state, 'Hit_Pressure_Gauge');

state = clickPart(state, 'Hit_Pressure_Gauge');
assert.equal(state.phase, 'completed');
assert.ok(state.result);
expectPrimaryPart(state, null);

const completedClick = resolveHeatCapacityPartAction(state, 'Hit_Pressure_Gauge');
assert.equal(completedClick.accepted, false);
assert.equal(completedClick.action, null);
assert.match(completedClick.message, /已完成/);

console.log('heatCapacityInteraction tests passed');
