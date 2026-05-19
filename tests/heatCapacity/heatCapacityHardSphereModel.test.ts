import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEAT_CAPACITY_HARD_SPHERE_COLOR_MAX_MV,
  HEAT_CAPACITY_HARD_SPHERE_COLOR_MIN_MV,
  getHeatCapacityHardSphereVisualState,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  resolveHeatCapacityHardSphereTemperatureColor,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereColor.ts';

const ambient = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 0,
  phase: 'zeroed',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

const pumped = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1527,
  pressureMv: 120,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
});

assert.equal(ambient.outflowActive, false);
assert.equal(ambient.targetParticleCount >= 26 && ambient.targetParticleCount <= 36, true);
assert.equal(HEAT_CAPACITY_HARD_SPHERE_COLOR_MIN_MV, 1495, 'hard-sphere color ramp should start at the requested 1495 mV mapping point');
assert.equal(HEAT_CAPACITY_HARD_SPHERE_COLOR_MAX_MV, 1515, 'hard-sphere color ramp should end at the requested 1515 mV mapping point');
assert.equal(ambient.temperatureColorFactor, 0.2, 'room-temperature hard-sphere color factor should use the tighter 1495-1515 mV mapping range');
assert.equal(pumped.speedMultiplier > ambient.speedMultiplier + 0.55, true, 'higher U_T should visibly increase particle speed');
assert.equal(pumped.temperatureColorFactor, 1, 'heated U_T should move the temperature color factor to the warm end');
assert.equal(pumped.targetParticleCount >= 68 && pumped.targetParticleCount <= 80, true, 'higher U_p / pumping should reach the high-density visual range');
assert.equal(pumped.targetParticleCount <= 80, true, 'visual particle pool should stay capped');

const coldExtension = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1489,
  pressureMv: 0,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

const warmExtension = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1527,
  pressureMv: 120,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
});

assert.equal(coldExtension.temperatureColorFactor, 0, '1489-1495 mV should extend the cold endpoint color');
assert.equal(warmExtension.temperatureColorFactor, 1, '1515-1527 mV should extend the warm endpoint color');

const sameTemperatureFast = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 120,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  pressureDeltaKPa: 6,
});

assert.equal(
  sameTemperatureFast.temperatureColorFactor,
  ambient.temperatureColorFactor,
  'the same U_T must map to the same color factor even when pressure and pump phase increase particle speed',
);
assert.equal(
  sameTemperatureFast.speedMultiplier > ambient.speedMultiplier,
  true,
  'speed should still respond to pumping after color is decoupled from speed',
);

const releasing = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1490,
  pressureMv: 110,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
  releaseBurstActive: true,
});

assert.equal(releasing.outflowActive, true, 'only the real pressure-release burst should trigger particle outflow');
assert.equal(releasing.outflowIntensity > 0, true);
assert.equal(releasing.speedMultiplier < ambient.speedMultiplier - 0.12, true, 'lower U_T should visibly reduce particle speed');
assert.equal(releasing.temperatureColorFactor < ambient.temperatureColorFactor, true, 'release cooling should lower the temperature color factor through the temperature reading itself');
assert.equal(releasing.targetParticleCount >= 18 && releasing.targetParticleCount <= 32, true, 'release should enter the low-density visual range');

const noPressureOpen = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 0,
  phase: 'zeroed',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0,
  releaseBurstActive: false,
});

assert.equal(noPressureOpen.outflowActive, false, 'opening the stopcock without pressure difference should not create directed outflow');
assert.equal(noPressureOpen.targetParticleCount >= 26 && noPressureOpen.targetParticleCount <= 36, true);

const blockedBounce = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: ambient.speedMultiplier,
  pressureMv: 0,
  phase: 'readyToPump',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'releasing',
});

assert.equal(blockedBounce.outflowActive, false, 'rollback animations must not be treated as real outflow');
assert.equal(blockedBounce.targetParticleCount >= 26, true);

const demoComplete = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: null,
  pressureMv: null,
  phase: 'demoComplete',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

assert.equal(demoComplete.targetParticleCount > 0, true, 'demoComplete should keep a final teaching particle state when the view remains enabled');
assert.equal(demoComplete.outflowActive, false);

const poweredOff = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: 1499,
  pressureMv: 0,
  phase: 'powerOff',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

assert.equal(poweredOff.targetParticleCount > 0, true, 'powered-off display should keep the current teaching particle pool visible');

const modelSource = readFileSync(join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereModel.ts'), 'utf8');
assert.doesNotMatch(modelSource, /HARD_SPHERE_GAMMA|5\s*\/\s*3/, 'visual model must not import or encode the old hard-sphere gas theory');
assert.doesNotMatch(modelSource, /getSpeedBandColor/, 'hard-sphere color should no longer be derived from particle speed');

assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 0), '#2563eb', 'dark low-temperature color should use the selected C-option cold blue');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 1), '#f59e0b', 'dark high-temperature color should keep the A-option amber endpoint');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 0), '#2563eb', 'light low-temperature color should keep the A-option blue endpoint');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 1), '#ea580c', 'light high-temperature color should keep the A-option red-orange endpoint');
assert.notEqual(
  resolveHeatCapacityHardSphereTemperatureColor('dark', 0.5),
  resolveHeatCapacityHardSphereTemperatureColor('light', 0.5),
  'dark and light scenes should use separate temperature color ramps',
);


