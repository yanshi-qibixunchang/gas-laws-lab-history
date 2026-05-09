import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HEAT_CAPACITY_HIT_PARTS,
  HEAT_CAPACITY_INSTRUMENT_PARTS,
  HEAT_CAPACITY_RENDER_PARTS,
} from '../components/advancedHeatCapacity/InstrumentModelContract.ts';

const expectedParts = [
  'Vessel',
  'Valve_C1',
  'Valve_C2',
  'Pump_Handle',
  'Pressure_Gauge_Needle',
  'Temperature_Display',
  'Square_Glass_Bottle',
  'Glass_Wall_Panels',
  'Glass_Edge_Frame',
  'Glass_Bottom_Base',
  'Glass_Outer_Shell',
  'Sealing_Stopper',
  'Top_Glass_Tube',
  'Valve_Manifold',
  'Pressure_Sensor',
  'Temperature_Sensor',
  'Sensor_Cable_Pressure',
  'Sensor_Cable_Temperature',
  'Instrument_Box',
  'Instrument_Box_Display',
  'Instrument_Box_Front_Panel',
  'Instrument_Box_Temp_LCD',
  'Instrument_Box_Pressure_LCD',
  'Instrument_Box_Temp_Display',
  'Instrument_Box_Pressure_Display',
  'Instrument_Box_Analog_Gauge',
  'Instrument_Box_Power_Light',
  'Instrument_Box_Pump_Control',
  'Instrument_Box_Power_Switch',
  'Instrument_Box_Pump_Check_Switch',
  'Pump_Column',
  'Pump_Slider',
  'Hit_C1',
  'Hit_C2',
  'Hit_Pump',
  'Hit_Pressure_Gauge',
  'Hit_Temperature_Display',
  'Hit_Instrument_Box',
];

assert.deepEqual(HEAT_CAPACITY_INSTRUMENT_PARTS, expectedParts);
assert.deepEqual(HEAT_CAPACITY_RENDER_PARTS, [
  'Vessel',
  'Valve_C1',
  'Valve_C2',
  'Pump_Handle',
  'Pressure_Gauge_Needle',
  'Temperature_Display',
  'Square_Glass_Bottle',
  'Glass_Wall_Panels',
  'Glass_Edge_Frame',
  'Glass_Bottom_Base',
  'Glass_Outer_Shell',
  'Sealing_Stopper',
  'Top_Glass_Tube',
  'Valve_Manifold',
  'Pressure_Sensor',
  'Temperature_Sensor',
  'Sensor_Cable_Pressure',
  'Sensor_Cable_Temperature',
  'Instrument_Box',
  'Instrument_Box_Display',
  'Instrument_Box_Front_Panel',
  'Instrument_Box_Temp_LCD',
  'Instrument_Box_Pressure_LCD',
  'Instrument_Box_Temp_Display',
  'Instrument_Box_Pressure_Display',
  'Instrument_Box_Analog_Gauge',
  'Instrument_Box_Power_Light',
  'Instrument_Box_Pump_Control',
  'Instrument_Box_Power_Switch',
  'Instrument_Box_Pump_Check_Switch',
  'Pump_Column',
  'Pump_Slider',
]);
assert.deepEqual(HEAT_CAPACITY_HIT_PARTS, [
  'Hit_C1',
  'Hit_C2',
  'Hit_Pump',
  'Hit_Pressure_Gauge',
  'Hit_Temperature_Display',
  'Hit_Instrument_Box',
]);
assert.equal(new Set(HEAT_CAPACITY_INSTRUMENT_PARTS).size, HEAT_CAPACITY_INSTRUMENT_PARTS.length);

const referenceStyleRenderOnlyParts = [
  'Glass_Outer_Shell',
  'Square_Glass_Bottle',
  'Glass_Wall_Panels',
  'Glass_Edge_Frame',
  'Glass_Bottom_Base',
  'Sealing_Stopper',
  'Top_Glass_Tube',
  'Valve_Manifold',
  'Instrument_Box_Temp_Display',
  'Instrument_Box_Pressure_Display',
  'Instrument_Box_Analog_Gauge',
  'Instrument_Box_Front_Panel',
  'Instrument_Box_Temp_LCD',
  'Instrument_Box_Pressure_LCD',
  'Instrument_Box_Power_Light',
  'Instrument_Box_Pump_Control',
  'Instrument_Box_Power_Switch',
  'Instrument_Box_Pump_Check_Switch',
  'Pump_Column',
  'Pump_Slider',
];
for (const partId of referenceStyleRenderOnlyParts) {
  assert.ok(HEAT_CAPACITY_RENDER_PARTS.includes(partId), `${partId} should be a render contract node`);
  assert.ok(!HEAT_CAPACITY_HIT_PARTS.includes(partId), `${partId} should not become a main-progress hitbox`);
}

const modelSource = readFileSync(new URL('../components/advancedHeatCapacity/InstrumentProceduralModel.tsx', import.meta.url), 'utf8');
assert.match(
  modelSource,
  /particleVisualState/,
  'procedural model should consume the shared particle visual state',
);
assert.match(
  modelSource,
  /useFrame/,
  'procedural model should animate particles with the render loop',
);
assert.match(
  modelSource,
  /outflowActive/,
  'procedural model should support the C2 outflow teaching visual',
);
assert.match(
  modelSource,
  /displayState/,
  'procedural model should consume the shared read-only display state for the instrument box',
);
assert.match(
  modelSource,
  /传感器数据由压力腔内传感器采集并显示到外部仪表箱/,
  'procedural model should explain the sensor-to-instrument-box measurement chain',
);
for (const partId of HEAT_CAPACITY_RENDER_PARTS) {
  const directName = new RegExp(`name=["'{]${partId}`);
  const componentPart = new RegExp(`partId="${partId}"`);
  assert.ok(
    directName.test(modelSource) || componentPart.test(modelSource),
    `procedural model should keep a named ${partId} node`,
  );
}
assert.doesNotMatch(
  modelSource,
  /<Gauge\b/,
  'the old standalone top pressure gauge should not be rendered after the instrument-box gauge exists',
);
assert.match(
  modelSource,
  /name="Instrument_Box_Analog_Gauge"[\s\S]*name="Pressure_Gauge_Needle"/,
  'the pressure-gauge needle contract should live inside the instrument-box analog gauge',
);
for (const hitPartId of HEAT_CAPACITY_HIT_PARTS) {
  const directHitName = new RegExp(`name=["'{]${hitPartId}`);
  const componentHitPart = new RegExp(`hitPartId="${hitPartId}"`);
  assert.ok(
    directHitName.test(modelSource) || componentHitPart.test(modelSource),
    `procedural model should keep a named ${hitPartId} hitbox`,
  );
  const directActivation = new RegExp(`stopAndActivate\\(event, '${hitPartId}'`);
  const componentActivation = /stopAndActivate\(event, hitPartId/.test(modelSource) && componentHitPart.test(modelSource);
  assert.ok(
    directActivation.test(modelSource) || componentActivation,
    `${hitPartId} should report its hitbox id upward`,
  );
}

const experimentSource = readFileSync(new URL('../components/advancedHeatCapacity/HeatCapacityExperiment.tsx', import.meta.url), 'utf8');
assert.match(
  experimentSource,
  /getHeatCapacityParticleVisualState\(state\)/,
  'heat-capacity UI should compute particle visual state from the experiment state',
);
assert.match(
  experimentSource,
  /resolveHeatCapacityPartAction\(state, partId\)/,
  '3D part clicks should be routed through the shared heat-capacity interaction resolver',
);
assert.match(
  experimentSource,
  /getHeatCapacityInstrumentDisplayState\(state\)/,
  'heat-capacity UI should pass a read-only display state into the 3D instrument model',
);

console.log('heatCapacityInstrumentContract tests passed');
