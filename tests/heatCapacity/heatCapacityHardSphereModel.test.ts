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
assert.equal(pumped.thermalSpeedMultiplier > ambient.thermalSpeedMultiplier, true, 'higher gas temperature should visibly increase random thermal particle speed');
assert.equal(pumped.speedMultiplier, pumped.thermalSpeedMultiplier, 'speed multiplier should remain an alias of thermal speed for existing visual consumers');
assert.equal(pumped.temperatureColorFactor, 1, 'heated U_T should move the temperature color factor to the warm end');
assert.equal(pumped.targetParticleCount, 90, 'active pump flow should not add temporary inlet-particle emphasis beyond the gas amount');
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
assert.equal(coldExtension.thermalSpeedMultiplier >= 0.76, true, 'cold gas should still keep enough random thermal motion for the slowest visible hard spheres');
assert.equal(warmExtension.temperatureColorFactor, 1, 'gas 3 K above ambient should reach the warm endpoint color');
assert.equal(warmExtension.thermalSpeedMultiplier > ambient.thermalSpeedMultiplier, true, 'warm gas should use the faster end of the thermal hard-sphere speed mapping');
assert.equal(warmExtension.targetParticleCount, sealedAfterFourPumps.targetParticleCount, 'same gas amount should use the same molecule count whether the pump is currently compressing or sealed');

const demoTeachingPumping = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1518,
  pressureMv: 90,
  gasAmountRatio: 1.045,
  gasTemperatureK: 300.65,
  ambientTemperatureK: 298.15,
  phase: 'pumping',
  glassStopcockOpen: false,
  pumpValveOpen: true,
  pumpBulbState: 'compressing',
  pumpFlowActive: true,
  pumpFlowIntensity: 0.75,
  pressureDeltaKPa: 4.5,
});

assert.equal(demoTeachingPumping.outflowActive, false, 'demo pumping should not be treated as a release outflow');
assert.equal(demoTeachingPumping.targetParticleCount > ambient.targetParticleCount, true, 'demo pumping should increase the visible molecule pool only from the gas amount state');
assert.equal(demoTeachingPumping.thermalSpeedMultiplier > ambient.thermalSpeedMultiplier, true, 'demo pumping should accelerate random thermal motion only through the teaching temperature signal');
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
assert.equal(
  sameTemperatureFast.thermalSpeedMultiplier,
  ambient.thermalSpeedMultiplier,
  'pressure alone must not alter random thermal speed when temperature is unchanged',
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
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
});

assert.equal(releasing.outflowActive, true, 'open glass stopcock with pressure difference should trigger particle outflow');
assert.equal(releasing.outflowDriftSpeed > 0, true, 'open glass stopcock with pressure difference should create directed drift speed');
assert.equal(
  Object.prototype.hasOwnProperty.call(releasing, 'exitSelectionRate'),
  false,
  'release particle counts should be owned by the release timeline, not the visual drift model',
);
assert.equal(releasing.thermalSpeedMultiplier < ambient.thermalSpeedMultiplier, true, 'release cooling should slow random thermal motion through the temperature reading itself');
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
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
});

assert.equal(
  confirmedTeachingReleaseStart.outflowActive,
  true,
  'teaching-mode open stopcock with pressure difference should start directed molecule outflow immediately',
);
assert.equal(
  confirmedTeachingReleaseStart.outflowDriftSpeed >= releasing.outflowDriftSpeed - 0.01,
  true,
  'teaching-mode pressure difference should use the same fast directed outflow drift as free mode',
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
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0.06,
});

assert.equal(
  nearEquilibriumRelease.outflowActive,
  false,
  'near-equal inner and outer pressure should return hard spheres to non-directed thermal motion',
);
assert.equal(nearEquilibriumRelease.outflowDriftSpeed, 0, 'near-equal pressure should not apply outlet drift');

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

const openStopcockPressureDifferencePoweredOff = getHeatCapacityHardSphereVisualState({
  powerOn: false,
  temperatureMv: 1490,
  pressureMv: 110,
  gasAmountRatio: 1.06,
  gasTemperatureK: 293.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 5.5,
});

assert.equal(openStopcockPressureDifferencePoweredOff.outflowActive, true, 'open glass stopcock with pressure difference should trigger directed particle motion even when the power is off and no release workflow is active');
assert.equal(openStopcockPressureDifferencePoweredOff.outflowDriftSpeed > 0, true, 'open glass stopcock with pressure difference should create outlet drift without requiring powered sensors');
assert.equal(openStopcockPressureDifferencePoweredOff.targetParticleCount > releasing.targetParticleCount, true, 'pre-release molecule count should still reflect the larger gas amount');

const noPressureOpen = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 0,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0,
});

assert.equal(noPressureOpen.outflowActive, false, 'opening the stopcock without pressure difference should not create directed outflow');
assert.equal(noPressureOpen.outflowDriftSpeed, 0, 'zero pressure difference should not create directed drift even when the stopcock is open');
assert.equal(noPressureOpen.targetParticleCount, 42);

const cooledVentedStandard = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1494,
  pressureMv: 0,
  gasAmountRatio: 0.94,
  gasTemperatureK: 292.15,
  ambientTemperatureK: 298.15,
  phase: 'recovering',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0,
  particleMultiplier: 1,
});
assert.equal(
  cooledVentedStandard.targetParticleCount,
  ambient.targetParticleCount,
  'standard visual preset should not show fewer molecules than its initial baseline after venting',
);

const highParticlePresetAmbient = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 0,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'readyToPump',
  glassStopcockOpen: false,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  particleMultiplier: 1.25,
});
const highParticlePresetVented = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1494,
  pressureMv: 0,
  gasAmountRatio: 0.94,
  gasTemperatureK: 292.15,
  ambientTemperatureK: 298.15,
  phase: 'recovering',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 0,
  particleMultiplier: 1.25,
});
assert.equal(
  highParticlePresetVented.targetParticleCount,
  highParticlePresetAmbient.targetParticleCount,
  'high-particle visual preset should keep its own higher initial molecule floor after venting',
);

const lowPressureRelease = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 20,
  gasAmountRatio: 1.02,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 1,
});

const highPressureRelease = getHeatCapacityHardSphereVisualState({
  powerOn: true,
  temperatureMv: 1499,
  pressureMv: 120,
  gasAmountRatio: 1.02,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
  phase: 'releasing',
  glassStopcockOpen: true,
  pumpValveOpen: false,
  pumpBulbState: 'idle',
  pressureDeltaKPa: 6,
});

assert.equal(
  highPressureRelease.outflowDriftSpeed > lowPressureRelease.outflowDriftSpeed,
  true,
  'larger pressure difference should create faster directed release drift',
);
assert.equal(
  highPressureRelease.thermalSpeedMultiplier,
  lowPressureRelease.thermalSpeedMultiplier,
  'pressure difference should not change random thermal speed at the same temperature',
);

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
  'all particles should receive some outlet-directed drift while the glass stopcock is open under pressure difference',
);
assert.match(
  hardSphereSimulationSource,
  /getOutletAttractionDirection/,
  'release outflow should pull particles toward the bottle mouth instead of moving every particle straight up',
);
assert.match(
  hardSphereSimulationSource,
  /EXIT_OCCLUSION_OFFSET/,
  'release particles should disappear at the stopper occlusion plane instead of visibly crossing the stopper',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /motion\.velocity\.addScaledVector\(OUTLET_DIRECTION/,
  'release drift should be aimed toward the mouth/stopper target, not only along the global outlet axis',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /RELEASE_EXIT_RATE_PER_S|RELEASE_REPLENISH_RATE_PER_S/,
  'hard-sphere layer should not keep legacy release constants after release timelines own exit counts',
);
assert.match(
  hardSphereLayerSource,
  /const RELEASE_VISUAL_TAIL_S = 0\.2;/,
  'release animation should keep a visual tail so the visible release duration is roughly doubled',
);
assert.match(
  hardSphereLayerSource,
  /outflowActive:\s*currentVisual\.outflowActive/,
  'release tail should not mark new particles for exit after the physical outflow has stopped',
);
assert.match(
  hardSphereLayerSource,
  /stepHeatCapacityHardSphereSimulation/,
  'hard-sphere layer should delegate directed release motion to the reusable simulation module',
);
assert.match(
  hardSphereSimulationSource,
  /releaseExitBudget/,
  'hard-sphere simulation should select release particles from explicit release timeline budgets',
);
assert.doesNotMatch(
  hardSphereSimulationSource,
  /exitSelectionRate|EXIT_SELECTION/,
  'hard-sphere simulation should not keep legacy pressure-rate particle selection',
);
assert.doesNotMatch(
  modelSource,
  /outflowIntensity|releaseProgress\?:|exitSelectionRate/,
  'hard-sphere visual model should not expose legacy combined outflow, progress, or selection-rate fields',
);
assert.match(
  hardSphereSimulationSource,
  /particle\.state = 'exiting'/,
  'hard-sphere simulation should move selected particles through an exiting state before hiding them',
);

assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 0), '#60a5fa', 'dark low-temperature color should stay bright enough on a dark workbench');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 0.5), '#a78bfa', 'dark mid-temperature color should avoid green so particles stay distinct from bench materials');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('dark', 1), '#fb923c', 'dark high-temperature color should keep a warm endpoint');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 0), '#1d4ed8', 'light low-temperature color should use a saturated blue endpoint');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 0.5), '#7c3aed', 'light mid-temperature color should move away from cyan-green bench tones');
assert.equal(resolveHeatCapacityHardSphereTemperatureColor('light', 1), '#dc2626', 'light high-temperature color should use a clear warm red endpoint');
assert.notEqual(
  resolveHeatCapacityHardSphereTemperatureColor('dark', 0.5),
  resolveHeatCapacityHardSphereTemperatureColor('light', 0.5),
  'dark and light scenes should use separate temperature color ramps',
);
