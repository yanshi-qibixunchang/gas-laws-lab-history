import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getHeatCapacityHardSphereVisualState,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereModel.ts';
import {
  resolveHeatCapacityHardSphereTemperatureColor,
} from '../../src/domain/heatCapacity/heatCapacityHardSphereColor.ts';

const ambient = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 0,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'zeroed',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

const pumped = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1527,
  pressureMv: 120,
  gasAmountRatio: 1.06,
  gasTemperatureK: 301.15,
  ambientTemperatureK: 298.15,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  pumpFlowActive: true,
  pumpFlowIntensity: 1,
});

assert.equal(ambient.outflowActive, false);
assert.equal(ambient.targetParticleCount, 42, 'baseline gas amount should map to the baseline molecule count');
assert.equal(ambient.temperatureColorFactor, 0.625, 'room-temperature hard-sphere color factor should be the neutral point of the -5 K to +3 K range');
assert.equal(pumped.speedMultiplier > ambient.speedMultiplier + 0.9, true, 'higher U_T should visibly increase particle speed');
assert.equal(pumped.temperatureColorFactor, 1, 'heated U_T should move the temperature color factor to the warm end');
assert.equal(pumped.targetParticleCount >= 112 && pumped.targetParticleCount <= 118, true, 'active pump flow should show at least triple the previous inlet-particle emphasis');
assert.equal(pumped.targetParticleCount <= 128, true, 'visual particle pool should stay capped');
const sealedAfterFourPumps = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1502,
  pressureMv: 120,
  gasAmountRatio: 1.06,
  gasTemperatureK: 299.15,
  ambientTemperatureK: 298.15,
  phase: 'sealedStabilizing',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
assert.equal(sealedAfterFourPumps.targetParticleCount >= 89 && sealedAfterFourPumps.targetParticleCount <= 91, true, 'four completed pump strokes should keep visible molecule-count steps at least triple the previous mapping');

const coldExtension = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1489,
  pressureMv: 0,
  gasAmountRatio: 1,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  stopcockFlowOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

const warmExtension = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1527,
  pressureMv: 120,
  gasAmountRatio: 1.06,
  gasTemperatureK: 301.15,
  ambientTemperatureK: 298.15,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  pumpFlowActive: true,
  pumpFlowIntensity: 1,
});

assert.equal(coldExtension.temperatureColorFactor, 0, 'gas 5 K below ambient should reach the cold endpoint color');
assert.equal(coldExtension.speedMultiplier >= 0.76, true, 'cold gas should still keep enough motion for the slowest visible hard spheres');
assert.equal(warmExtension.temperatureColorFactor, 1, 'gas 3 K above ambient should reach the warm endpoint color');
assert.equal(warmExtension.speedMultiplier > 1.9, true, 'active pumping should use the faster end of the hard-sphere speed mapping');

const demoTeachingPumping = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1518,
  pressureMv: 90,
  gasAmountRatio: 1.045,
  gasTemperatureK: 300.65,
  ambientTemperatureK: 298.15,
  phase: 'pumping',
  glassStopcockOpen: false,
  stopcockFlowOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  pumpFlowActive: true,
  pumpFlowIntensity: 0.75,
  pressureDeltaKPa: 4.5,
});

assert.equal(demoTeachingPumping.outflowActive, false, 'demo pumping should not be treated as a release outflow');
assert.equal(demoTeachingPumping.targetParticleCount > ambient.targetParticleCount, true, 'demo pumping should increase the visible molecule pool from the same shared state model');
assert.equal(demoTeachingPumping.speedMultiplier > ambient.speedMultiplier, true, 'demo pumping should visibly accelerate the shared particle layer');
assert.equal(demoTeachingPumping.temperatureColorFactor > ambient.temperatureColorFactor, true, 'demo pumping should drive particle color from the teaching temperature signal');

const sameTemperatureFast = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 120,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'sealedStabilizing',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 6,
});

assert.equal(
  sameTemperatureFast.temperatureColorFactor,
  ambient.temperatureColorFactor,
  'the same U_T must map to the same color factor even when pressure and pump phase increase particle speed',
);
assert.equal(
  sameTemperatureFast.targetParticleCount,
  ambient.targetParticleCount,
  'pressure alone must not change molecule count when gas amount is unchanged',
);

const releasing = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1490,
  pressureMv: 110,
  gasAmountRatio: 1.02,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  stopcockFlowOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
  releaseFlowActive: true,
  releaseProgress: 0.5,
});

assert.equal(releasing.outflowActive, true, 'only the confirmed release flow should trigger particle outflow');
assert.equal(releasing.outflowIntensity > 0, true);
assert.equal(releasing.speedMultiplier >= ambient.speedMultiplier + 0.75, true, 'confirmed release outflow should make the directed expansion visibly fast');
assert.equal(releasing.temperatureColorFactor < ambient.temperatureColorFactor, true, 'release cooling should lower the temperature color factor through the temperature reading itself');
assert.equal(releasing.targetParticleCount > ambient.targetParticleCount, true, 'partial release should still show more molecules than the fully vented baseline when gas amount remains above 1');
assert.equal(releasing.targetParticleCount < sealedAfterFourPumps.targetParticleCount, true, 'release should visibly reduce molecule count while staying above the initial state');

const confirmedTeachingReleaseStart = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1490,
  pressureMv: 110,
  gasAmountRatio: 1.02,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  stopcockFlowOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
  releaseFlowActive: true,
  releaseProgress: 0,
});

assert.equal(
  confirmedTeachingReleaseStart.outflowActive,
  true,
  'confirmed teaching-mode release should start directed molecule outflow immediately, even before progress advances',
);
assert.equal(
  confirmedTeachingReleaseStart.speedMultiplier >= releasing.speedMultiplier - 0.01,
  true,
  'teaching-mode release should use the same fast directed outflow speed as free mode once flow is confirmed',
);

const nearEquilibriumRelease = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1498.8,
  pressureMv: 1.2,
  gasAmountRatio: 1,
  gasTemperatureK: 298.05,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  stopcockFlowOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0.06,
  releaseFlowActive: true,
  releaseProgress: 0.6,
});

assert.equal(
  nearEquilibriumRelease.outflowActive,
  false,
  'near-equal inner and outer pressure should return hard spheres to non-directed thermal motion',
);

const oneStrokeAmount = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1500,
  pressureMv: 30,
  gasAmountRatio: 1.015,
  gasTemperatureK: 298.5,
  ambientTemperatureK: 298.15,
  phase: 'sealedStabilizing',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});
const oneStrokeParticleGainPercent =
  (oneStrokeAmount.targetParticleCount - ambient.targetParticleCount) /
  ambient.targetParticleCount *
  100;
assert.equal(
  oneStrokeParticleGainPercent >= 27 && oneStrokeParticleGainPercent <= 30,
  true,
  'a 1.5% physical gas amount increase should be visually exaggerated to at least triple the previous molecule gain',
);

const clickedButNotConnected = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1490,
  pressureMv: 110,
  gasAmountRatio: 1.06,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  stopcockFlowOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
  releaseFlowActive: false,
});

assert.equal(clickedButNotConnected.outflowActive, false, 'clicking or animating the stopcock before confirmed flow must not trigger directed particle motion');
assert.equal(clickedButNotConnected.targetParticleCount > releasing.targetParticleCount, true, 'pre-release molecule count should still reflect the larger gas amount');

const noPressureOpen = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 0,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'zeroed',
  glassStopcockOpen: true,
  stopcockFlowOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0,
  releaseFlowActive: false,
});

assert.equal(noPressureOpen.outflowActive, false, 'opening the stopcock without pressure difference should not create directed outflow');
assert.equal(noPressureOpen.targetParticleCount, 42);

const blockedBounce = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: ambient.speedMultiplier,
  pressureMv: 0,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
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
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
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
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'powerOff',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
});

assert.equal(poweredOff.targetParticleCount > 0, true, 'powered-off display should keep the current teaching particle pool visible');

const modelSource = readFileSync(join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereModel.ts'), 'utf8');
const hardSphereLayerSource = readFileSync(join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityHardSphereLayer.tsx'), 'utf8');
const hardSphereSimulationSource = readFileSync(join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereSimulation.ts'), 'utf8');
assert.doesNotMatch(modelSource, /HARD_SPHERE_GAMMA|5\s*\/\s*3/, 'visual model must not import or encode the old hard-sphere gas theory');
assert.doesNotMatch(modelSource, /getSpeedBandColor/, 'hard-sphere color should no longer be derived from particle speed');
assert.doesNotMatch(
  hardSphereLayerSource,
  /resetParticleInsideBottle\(motion,\s*particle,\s*false\)/,
  'release outflow particles should leave the vessel instead of being reset back inside',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /outflowBias\s*>\s*0\.48/,
  'all particles should receive some outlet-directed drift during confirmed release flow',
);
assert.match(
  hardSphereLayerSource,
  /OUTLET_APPROACH_POINT/,
  'release outflow should pull particles toward the bottle mouth instead of moving every particle straight up',
);
assert.match(
  hardSphereLayerSource,
  /OUTLET_OCCLUSION_Y/,
  'release particles should disappear at the stopper occlusion plane instead of visibly crossing the stopper',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /motion\.velocity\.addScaledVector\(OUTLET_DIRECTION/,
  'release drift should be aimed toward the mouth/stopper target, not only along the global outlet axis',
);
assert.match(
  hardSphereLayerSource,
  /const RELEASE_EXIT_RATE_PER_S = 504;/,
  'release should select exiting particles more aggressively so the outflow ratio is visually higher',
);
assert.match(
  hardSphereLayerSource,
  /const RELEASE_VISUAL_TAIL_S = 0\.2;/,
  'release animation should keep a visual tail so the visible release duration is roughly doubled',
);
assert.match(
  hardSphereLayerSource,
  /RELEASE_REPLENISH_RATE_PER_S/,
  'release should be able to replenish particles while venting when the inside count falls below the target count',
);
assert.match(
  hardSphereLayerSource,
  /stepHeatCapacityHardSphereSimulation/,
  'hard-sphere layer should delegate directed release motion to the reusable simulation module',
);
assert.match(
  hardSphereSimulationSource,
  /outflowDriftSpeed[\s\S]*exitSelectionRate/,
  'hard-sphere simulation should keep pressure-driven drift and exit selection as explicit inputs',
);
assert.match(
  hardSphereSimulationSource,
  /particle\.state = 'exiting'/,
  'hard-sphere simulation should move selected particles through an exiting state before hiding them',
);

assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 0), '#2563eb', 'dark low-temperature color should use the selected C-option cold blue');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 1), '#f59e0b', 'dark high-temperature color should keep the A-option amber endpoint');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 0), '#2563eb', 'light low-temperature color should keep the A-option blue endpoint');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 1), '#ea580c', 'light high-temperature color should keep the A-option red-orange endpoint');
assert.notEqual(
  resolveHeatCapacityHardSphereTemperatureColor('dark', 0.5),
  resolveHeatCapacityHardSphereTemperatureColor('light', 0.5),
  'dark and light scenes should use separate temperature color ramps',
);

