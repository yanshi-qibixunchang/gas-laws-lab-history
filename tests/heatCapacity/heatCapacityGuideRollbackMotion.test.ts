import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_BLOCKED_KNOB_LEFT_TRAVEL_DEG,
  HEAT_CAPACITY_BLOCKED_KNOB_RIGHT_TRAVEL_DEG,
  HEAT_CAPACITY_BLOCKED_PUMP_BULB_COMPRESSION,
  HEAT_CAPACITY_BLOCKED_VALVE_TRAVEL_DEG,
  HeatCapacityGuideRollbackMotion,
  createHeatCapacityBinaryRollbackPlan,
  createHeatCapacityKnobRollbackPlan,
  createHeatCapacityPumpBulbRollbackPlan,
  type HeatCapacityGuideRollbackCue,
} from '../../src/features/heatCapacity/heatCapacityGuideRollbackMotion.ts';

const stepUntilIdle = (
  motion: HeatCapacityGuideRollbackMotion,
  cues: HeatCapacityGuideRollbackCue[],
) => {
  let largestMagnitude = 0;
  for (let index = 0; index < 240 && motion.getSnapshot().active; index += 1) {
    const result = motion.step(1 / 120);
    largestMagnitude = Math.max(largestMagnitude, Math.abs(result.value));
    cues.push(...result.cues);
  }
  assert.equal(motion.getSnapshot().active, false, 'rollback motion should settle');
  return largestMagnitude;
};

const valveMotion = new HeatCapacityGuideRollbackMotion();
const valvePlan = createHeatCapacityBinaryRollbackPlan({
  animation: 'valveBounce',
  amplitude: HEAT_CAPACITY_BLOCKED_VALVE_TRAVEL_DEG,
  departureAction: 'pumpValveClose',
  returnAction: 'pumpValveOpen',
});
const valveCues = valveMotion.trigger(1, valvePlan);
const valveLargestMagnitude = stepUntilIdle(valveMotion, valveCues);
assert.ok(valveLargestMagnitude <= HEAT_CAPACITY_BLOCKED_VALVE_TRAVEL_DEG);
assert.deepEqual(valveCues.map((cue) => cue.action), ['pumpValveClose', 'pumpValveOpen']);
assert.equal(valveMotion.getSnapshot().value, 0);

const interruptedMotion = new HeatCapacityGuideRollbackMotion();
const interruptedCues = interruptedMotion.trigger(10, valvePlan);
for (let index = 0; index < 7; index += 1) interruptedMotion.step(1 / 120);
const beforeInterrupt = interruptedMotion.getSnapshot();
assert.ok(beforeInterrupt.value > 0, 'first click should have started the outbound movement');
assert.notEqual(beforeInterrupt.velocity, 0);
interruptedCues.push(...interruptedMotion.trigger(11, valvePlan));
const afterInterrupt = interruptedMotion.getSnapshot();
assert.equal(afterInterrupt.value, beforeInterrupt.value, 'retrigger must not snap the control home');
assert.equal(afterInterrupt.velocity, beforeInterrupt.velocity, 'retrigger must preserve current velocity');
stepUntilIdle(interruptedMotion, interruptedCues);
assert.deepEqual(
  interruptedCues.map((cue) => cue.action),
  ['pumpValveClose', 'pumpValveOpen'],
  'a rapid double click should produce one departure and one return sound, never two queued pairs',
);

const knobMotion = new HeatCapacityGuideRollbackMotion();
const knobCues = knobMotion.trigger(20, createHeatCapacityKnobRollbackPlan());
let minimumKnobValue = 0;
let maximumKnobValue = 0;
for (let index = 0; index < 300 && knobMotion.getSnapshot().active; index += 1) {
  const result = knobMotion.step(1 / 120);
  minimumKnobValue = Math.min(minimumKnobValue, result.value);
  maximumKnobValue = Math.max(maximumKnobValue, result.value);
  knobCues.push(...result.cues);
}
assert.equal(knobMotion.getSnapshot().active, false);
assert.equal(knobMotion.getSnapshot().value, 0);
assert.ok(minimumKnobValue >= HEAT_CAPACITY_BLOCKED_KNOB_LEFT_TRAVEL_DEG);
assert.ok(maximumKnobValue <= HEAT_CAPACITY_BLOCKED_KNOB_RIGHT_TRAVEL_DEG);
assert.deepEqual(
  knobCues.map((cue) => cue.phase),
  ['knobLeftPeak', 'knobRightPeak', 'settled'],
  'blocked zero adjustment should sound at the two damped peaks and final settle',
);

const pumpBulbMotion = new HeatCapacityGuideRollbackMotion();
const pumpBulbCues = pumpBulbMotion.trigger(30, createHeatCapacityPumpBulbRollbackPlan());
const largestPumpBulbCompression = stepUntilIdle(pumpBulbMotion, pumpBulbCues);
assert.ok(largestPumpBulbCompression <= HEAT_CAPACITY_BLOCKED_PUMP_BULB_COMPRESSION);
assert.deepEqual(
  pumpBulbCues.map((cue) => cue.action),
  ['pumpBulbStroke'],
  'one blocked bulb press should use one complete stroke sound while its visual motion remains partial',
);
assert.equal(pumpBulbMotion.getSnapshot().value, 0);

console.log('heatCapacityGuideRollbackMotion tests passed');
