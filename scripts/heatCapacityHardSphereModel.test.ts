import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getHeatCapacityHardSphereVisualState,
} from '../components/heatCapacity/heatCapacityHardSphereModel.ts';

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
assert.equal(pumped.speedMultiplier > ambient.speedMultiplier + 0.55, true, 'higher U_T should visibly increase particle speed');
assert.notEqual(pumped.color, ambient.color, 'particle color should reflect the visual speed band');
assert.equal(pumped.targetParticleCount >= 68 && pumped.targetParticleCount <= 80, true, 'higher U_p / pumping should reach the high-density visual range');
assert.equal(pumped.targetParticleCount <= 80, true, 'visual particle pool should stay capped');

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

assert.equal(poweredOff.targetParticleCount, 0, 'powered-off display should hide microscopic particles');

const modelSource = readFileSync(join(process.cwd(), 'components', 'heatCapacity', 'heatCapacityHardSphereModel.ts'), 'utf8');
assert.doesNotMatch(modelSource, /HARD_SPHERE_GAMMA|5\s*\/\s*3/, 'visual model must not import or encode the old hard-sphere gas theory');
