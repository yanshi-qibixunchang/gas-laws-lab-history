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
  'Hit_C1',
  'Hit_C2',
  'Hit_Pump',
];

assert.deepEqual(HEAT_CAPACITY_INSTRUMENT_PARTS, expectedParts);
assert.deepEqual(HEAT_CAPACITY_RENDER_PARTS, [
  'Vessel',
  'Valve_C1',
  'Valve_C2',
  'Pump_Handle',
  'Pressure_Gauge_Needle',
  'Temperature_Display',
]);
assert.deepEqual(HEAT_CAPACITY_HIT_PARTS, ['Hit_C1', 'Hit_C2', 'Hit_Pump']);
assert.equal(new Set(HEAT_CAPACITY_INSTRUMENT_PARTS).size, HEAT_CAPACITY_INSTRUMENT_PARTS.length);

const modelSource = readFileSync(new URL('../components/advancedHeatCapacity/InstrumentProceduralModel.tsx', import.meta.url), 'utf8');
for (const partId of HEAT_CAPACITY_RENDER_PARTS) {
  const directName = new RegExp(`name=["'{]${partId}`);
  const componentPart = new RegExp(`partId="${partId}"`);
  assert.ok(
    directName.test(modelSource) || componentPart.test(modelSource),
    `procedural model should keep a named ${partId} node`,
  );
}
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
  /partId === 'Hit_Pump' && state\.phase === 'pumping'[\s\S]*?onAction\(\{ type: 'pump', strokes: 1 \}\)/,
  'Hit_Pump should only trigger pump while the experiment is in the pumping phase',
);
assert.match(
  experimentSource,
  /partId === 'Hit_C2' && state\.phase === 'releasing'[\s\S]*?onAction\(\{ type: 'release', durationMs: 420, closeDelayMs: 0 \}\)/,
  'Hit_C2 should only trigger release while the experiment is in the releasing phase',
);

console.log('heatCapacityInstrumentContract tests passed');
