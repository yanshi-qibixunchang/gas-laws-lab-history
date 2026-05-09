import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyHeatCapacityAction,
  createHeatCapacityExperiment,
  getHeatCapacityInstrumentDisplayState,
} from '../utils/heatCapacityExperiment.ts';

let state = createHeatCapacityExperiment({ ambientPressure: 100, ambientTemperature: 1 });
const initialDisplay = getHeatCapacityInstrumentDisplayState(state);
assert.equal(initialDisplay.pressure, state.pressure);
assert.equal(initialDisplay.temperature, state.temperature);
assert.equal(initialDisplay.phase, state.phase);
assert.deepEqual(initialDisplay.recorded, state.recorded);
assert.equal(initialDisplay.result, null);
assert.equal(initialDisplay.instrumentPowered, false);

state = applyHeatCapacityAction(state, { type: 'setInstrumentPower', powered: true });
state = applyHeatCapacityAction(state, { type: 'recordP0' });
state = applyHeatCapacityAction(state, { type: 'pump', strokes: 6 });
state = applyHeatCapacityAction(state, { type: 'stabilizeP1' });
state = applyHeatCapacityAction(state, { type: 'stabilizeP1' });
state = applyHeatCapacityAction(state, { type: 'recordP1' });
state = applyHeatCapacityAction(state, { type: 'release', durationMs: 420, closeDelayMs: 0 });
state = applyHeatCapacityAction(state, { type: 'recover' });
state = applyHeatCapacityAction(state, { type: 'recordP2' });

const completedBeforeDisplay = JSON.stringify(state);
const completedDisplay = getHeatCapacityInstrumentDisplayState(state);

assert.equal(JSON.stringify(state), completedBeforeDisplay, 'display state creation should not mutate the experiment state');
assert.equal(completedDisplay.pressure, state.pressure);
assert.equal(completedDisplay.temperature, state.temperature);
assert.equal(completedDisplay.phase, 'completed');
assert.equal(completedDisplay.instrumentPowered, true);
assert.deepEqual(completedDisplay.recorded, state.recorded);
assert.deepEqual(completedDisplay.result, state.result);
assert.ok(completedDisplay.result?.gamma);
assert.ok(completedDisplay.result?.relativeErrorPercent !== undefined);

const modelSource = readFileSync(new URL('../components/advancedHeatCapacity/InstrumentProceduralModel.tsx', import.meta.url), 'utf8');
const experimentSource = readFileSync(new URL('../components/advancedHeatCapacity/HeatCapacityExperiment.tsx', import.meta.url), 'utf8');
assert.match(
  experimentSource,
  /<div className="hidden">/,
  'large heat-capacity summary card should not remain visible above the 3D canvas',
);
assert.match(
  experimentSource,
  /grid-rows-\[minmax\(430px,1fr\)_auto\]/,
  'heat-capacity preview should give more initial height to the 3D canvas',
);
assert.match(
  modelSource,
  /const animatedTemperature = useAnimatedMetric\(displayState\.temperature/,
  'temperature digital display should derive an animated value from the shared display temperature',
);
assert.match(
  modelSource,
  /const animatedPressure = useAnimatedMetric\(displayState\.pressure/,
  'pressure digital display should derive an animated value from the shared display pressure',
);
assert.match(
  modelSource,
  /name="Instrument_Box_Analog_Gauge"[\s\S]*animatedPressure/,
  'analog instrument gauge should be driven by the animated pressure value',
);
assert.match(
  modelSource,
  /const PanelLeverSwitch/,
  'power and pump controls should use a shared panel lever component',
);
assert.match(
  modelSource,
  /text=\{'\u005c\u0075\u0035\u0066\u0030\u0030'\}/,
  'panel lever should render an on label',
);
assert.match(
  modelSource,
  /text=\{'\u005c\u0075\u0035\u0031\u0037\u0033'\}/,
  'panel lever should render an off label',
);
assert.match(
  modelSource,
  /name="Instrument_Box_Power_Switch"[\s\S]*Instrument_Box_Power_Switch/,
  'power switch should route to the real instrument power action',
);
assert.match(
  modelSource,
  /name="Instrument_Box_Power_Switch"[\s\S]*<TransparentHitboxMaterial \/>/,
  'power switch should have its own enlarged independent hitbox',
);
assert.match(
  modelSource,
  /name="Hit_Instrument_Box"[\s\S]*position=\{\[0, 0\.04, 0\.12\]\}[\s\S]*<boxGeometry args=\{\[3\.96, 1\.24, 0\.24\]\}/,
  'instrument-box explanation hitbox should sit behind the front controls instead of covering switches',
);
assert.match(
  modelSource,
  /name="Instrument_Box_Pump_Check_Switch"[\s\S]*Hit_Pump/,
  'panel pump control should route to the shared pump action',
);
assert.doesNotMatch(
  modelSource,
  /Instrument_Box_Temp_Display"[\s\S]{0,420}<Html/,
  'temperature digital display should be panel texture based rather than floating Html text',
);
assert.doesNotMatch(
  modelSource,
  /displayState\.temperature \* 1000/,
  'temperature digital display should show the experiment temperature value, not an unlabelled scaled sensor voltage',
);
assert.match(
  modelSource,
  /Instrument_Box_Temp_Display"[\s\S]*animatedTemperature/,
  'temperature digital display should stay bound to the animated display temperature',
);
assert.match(
  modelSource,
  /Instrument_Box_Pressure_Display"[\s\S]*animatedPressure/,
  'pressure digital display should stay bound to the animated display pressure',
);
assert.doesNotMatch(
  modelSource,
  /Instrument_Box_Pressure_Display"[\s\S]{0,420}<Html/,
  'pressure digital display should be panel texture based rather than floating Html text',
);
assert.match(
  modelSource,
  /name="Instrument_Box_Pressure_Display"[\s\S]*Hit_Pressure_Gauge/,
  'pressure display should be the active pressure-reading hitbox after removing the old top gauge',
);
assert.doesNotMatch(
  modelSource,
  /Instrument_Box_Power_Switch[\s\S]{0,900}<button/,
  'power switch should not use a floating HTML button',
);
assert.doesNotMatch(
  modelSource,
  /Instrument_Box_Pump_Control[\s\S]{0,900}<button/,
  'pump control should not use a floating HTML button',
);
assert.match(
  experimentSource,
  /const actionAnimationMs/,
  'guided operations should define visual lock durations',
);
assert.match(
  experimentSource,
  /operationLockMessage/,
  'guided operations should expose a short operation lock while the instrument animation settles',
);
assert.match(
  modelSource,
  /pumpPulseActive/,
  'pump lever should keep a short local action pulse after pump progress changes',
);

console.log('heatCapacityInstrumentDisplay tests passed');
