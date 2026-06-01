import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const scenePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const ultraModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx');
const runtimeGlbPath = join(process.cwd(), 'public', 'models', 'heat-capacity', 'fd-ncd-c-ultra.glb');

assert.equal(existsSync(runtimeGlbPath), true, 'Ultra GLB runtime asset should be available under public/models');
assert.equal(existsSync(ultraModelPath), true, 'Ultra GLB adapter component should exist');

const sceneSource = readFileSync(scenePath, 'utf8');
const ultraModelSource = readFileSync(ultraModelPath, 'utf8');

assert.match(
  sceneSource,
  /import HeatCapacityUltraInstrumentModel from '\.\/HeatCapacityUltraInstrumentModel';/,
  'Heat Capacity scene should import the Ultra GLB adapter',
);
assert.match(
  sceneSource,
  /const proceduralSceneContent = \([\s\S]*<InstrumentSceneContent[\s\S]*const instrumentSceneContent = props\.performanceMode === 'ultra'[\s\S]*<HeatCapacityUltraInstrumentModel[\s\S]*: proceduralSceneContent/,
  'Heat Capacity scene should render the Ultra GLB adapter only for the ultra performance mode and keep the procedural fallback for other modes',
);

[
  'fd-ncd-c-ultra.glb',
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_ZeroAdjustKnob',
  'Stopcock_Pivot',
  'InletValue_Pivot',
  'Pump_Bulb',
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_PressureGauge_NeedlePivot',
  'HSL_Hitbox_Stopcock',
  'HSL_Hitbox_PumpBulb',
  'HSL_Hitbox_PumpValve',
].forEach((requiredToken) => {
  assert.match(
    ultraModelSource,
    new RegExp(requiredToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB adapter should bind ${requiredToken}`,
  );
});

assert.match(
  ultraModelSource,
  /getPressureGaugeNeedleRotation[\s\S]*modelPressureGaugeAngleToVisualAngle/,
  'Ultra pressure gauge needle should reuse the shared pressure gauge contract mapping',
);
assert.match(
  ultraModelSource,
  /props\.powerOn \? formatSignal\(props\.temperatureSignalMv\) : ''[\s\S]*props\.powerOn \? formatSignal\(props\.pressureSignalMv\) : ''/,
  'Ultra digital display should blank dynamic signal values when power is off while keeping the fixed nameplate in the model',
);
assert.match(
  ultraModelSource,
  /<Html position=\{interactiveBoxes\.stopcock\.position\} center>[\s\S]*aria-label="Ultra glass stopcock hitbox"[\s\S]*props\.onStopcockOpenChange\(!stopcockOpen\)[\s\S]*<Html position=\{interactiveBoxes\.pumpBulb\.position\} center>[\s\S]*aria-label="Ultra pump bulb hitbox"[\s\S]*props\.onPumpBulbPress\(\)[\s\S]*<Html position=\{interactiveBoxes\.pumpValve\.position\} center>[\s\S]*aria-label="Ultra pump valve hitbox"[\s\S]*props\.onPumpValveToggle\(\)/,
  'Ultra GLB hitboxes should route stopcock, pump bulb, and pump valve interactions through HTML-projected scene callbacks',
);
assert.match(
  ultraModelSource,
  /aria-label="Ultra power switch hitbox"[\s\S]*props\.onPowerToggle\(!props\.powerOn\)[\s\S]*aria-label="Ultra pressure zero knob hitbox"[\s\S]*onPointerDown[\s\S]*props\.onPressureZeroCoarseAdjust\(deltaX \* 0\.45\)[\s\S]*onWheel[\s\S]*props\.onPressureZeroFineAdjust\(event\.deltaY < 0 \? 1 : -1\)/,
  'Ultra GLB projected hitboxes should keep power switching and pressure-zero knob drag/wheel interactions usable',
);

console.log('heatCapacityUltraGlbIntegration tests passed');
