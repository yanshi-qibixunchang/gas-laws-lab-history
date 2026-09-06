const heatControllerSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatCapacityController.ts', import.meta.url), 'utf8');
const realtimeClockSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatRealtimeClock.ts', import.meta.url), 'utf8');
const sceneStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatSceneState.ts', import.meta.url), 'utf8');
import { readFileSync as readHeatArchitectureSource } from 'node:fs';
const heatArchitectureWorkbenchHeatSceneVisualsSource = readHeatArchitectureSource(new URL('../../src/features/workbench/workbenchHeatSceneVisuals.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const profilePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityQualityProfiles.ts');
const scenePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const ultraModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx');
const workbenchPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx');
const generalSettingsPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchGeneralSettings.ts');
const generalSettingsWindowPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchGeneralSettingsWindow.tsx');
const stylePath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.css');

assert.equal(existsSync(profilePath), true, 'Heat Capacity quality profiles should live in one dedicated module');

const profileSource = readFileSync(profilePath, 'utf8');
const sceneSource = readFileSync(scenePath, 'utf8');
const ultraModelSource = readFileSync(ultraModelPath, 'utf8');
const workbenchSource = readFileSync(workbenchPath, 'utf8');
const generalSettingsSource = readFileSync(generalSettingsPath, 'utf8');
const generalSettingsWindowSource = readFileSync(generalSettingsWindowPath, 'utf8');
const styleSource = readFileSync(stylePath, 'utf8');

assert.match(
  profileSource,
  /export type HeatCapacityQualityMode = 'lowLoad' \| 'balanced' \| 'highPerformance' \| 'ultra';/,
  'quality mode keys should use the new clear tier names',
);
assert.match(
  profileSource,
  /export const HEAT_CAPACITY_QUALITY_MODE_ORDER: HeatCapacityQualityMode\[\] = \['lowLoad', 'balanced', 'highPerformance', 'ultra'\];/,
  'quality mode order should match the visible left-to-right settings control',
);
assert.match(
  profileSource,
  /export const DEFAULT_HEAT_CAPACITY_QUALITY_MODE: HeatCapacityQualityMode = 'highPerformance';/,
  'new default should be the mature GLB high-performance tier',
);
assert.match(
  profileSource,
  /lowLoad:[\s\S]*renderModel:\s*'procedural'[\s\S]*dpr:\s*1[\s\S]*particleMultiplier:\s*0\.5[\s\S]*speedMultiplier:\s*0\.8125[\s\S]*tickIntervalMs:\s*240/,
  'lowLoad should preserve the old low-load procedural behavior',
);
assert.match(
  profileSource,
  /balanced:[\s\S]*renderModel:\s*'procedural'[\s\S]*dpr:\s*2\.5[\s\S]*highClarityProcedural:\s*true[\s\S]*particleMultiplier:\s*1[\s\S]*speedMultiplier:\s*1\.1875[\s\S]*tickIntervalMs:\s*100/,
  'balanced should inherit the old high-performance procedural behavior',
);
assert.match(
  profileSource,
  /highPerformance:[\s\S]*renderModel:\s*'ultraGlb'[\s\S]*dpr:\s*1\.75[\s\S]*frameLoop:\s*'demand'[\s\S]*particleMultiplier:\s*1\.25[\s\S]*speedMultiplier:\s*1\.25[\s\S]*tickIntervalMs:\s*100/,
  'highPerformance should inherit the current GLB tier behavior',
);
assert.match(
  profileSource,
  /ultra:[\s\S]*renderModel:\s*'ultraGlb'[\s\S]*dpr:\s*2[\s\S]*frameLoop:\s*'demand'[\s\S]*enhancedLighting:\s*true[\s\S]*particleMultiplier:\s*1\.25[\s\S]*speedMultiplier:\s*1\.25[\s\S]*tickIntervalMs:\s*100/,
  'ultra should improve GLB clarity and refresh while leaving molecule count and rate equal to highPerformance',
);

assert.match(
  sceneStateSource,
  /import \{[\s\S]*HEAT_CAPACITY_QUALITY_PROFILES[\s\S]*\} from '\.\.\/heatCapacity\/heatCapacityQualityProfiles';/,
  'Workbench should consume the active quality profile values it uses for rendering',
);
assert.match(
  generalSettingsWindowSource,
  /import \{ HEAT_CAPACITY_QUALITY_MODE_ORDER \} from '\.\.\/heatCapacity\/heatCapacityQualityProfiles\.ts';/,
  'General settings should consume the shared quality-mode order used by its segmented control',
);
assert.match(
  generalSettingsSource,
  /export type WorkbenchPerformanceMode = HeatCapacityQualityMode;/,
  'general settings should own the quality-mode alias used by settings plumbing',
);
assert.match(
  generalSettingsSource,
  /export const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings_v2';/,
  'new quality settings should use a fresh storage key and ignore old local debug settings',
);
assert.match(
  generalSettingsSource,
  /performanceMode:\s*DEFAULT_HEAT_CAPACITY_QUALITY_MODE/,
  'general settings should default through the quality profile module',
);
assert.match(
  generalSettingsSource,
  /export const isWorkbenchPerformanceMode = \(value: unknown\): value is WorkbenchPerformanceMode => \(\s*typeof value === 'string' && HEAT_CAPACITY_QUALITY_MODE_ORDER\.includes\(value as HeatCapacityQualityMode\)\s*\);/,
  'settings validation should use the central quality mode order instead of old hard-coded keys',
);
assert.match(
  generalSettingsWindowSource,
  /HEAT_CAPACITY_QUALITY_MODE_ORDER\.map\(\(mode\) => \(/,
  'settings segmented control should render directly from quality mode order',
);
assert.match(
  sceneStateSource,
  /const heatCapacityQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES\[settingsPerformanceMode\];/,
  'Workbench should derive one active profile for particle multipliers and tick cadence',
);
assert.match(
  heatArchitectureWorkbenchHeatSceneVisualsSource,
  /particleMultiplier:\s*heatCapacityQualityProfile\.particleMultiplier[\s\S]*speedMultiplier:\s*heatCapacityQualityProfile\.speedMultiplier/,
  'Heat Capacity scene should receive molecule multipliers from the active quality profile',
);
assert.match(
  realtimeClockSource,
  /window\.setInterval\([\s\S]*heatCapacityQualityProfile\.tickIntervalMs\)/,
  'Heat Capacity stepping interval should come from the active quality profile',
);
assert.doesNotMatch(
  workbenchSource,
  /heatCapacityUltraModelIntegrationReady|heatCapacityTeachingModesAvailable|heatCapacityDeferredModeDisabled/,
  'old model-readiness gates should be removed now every quality tier supports teaching modes',
);

assert.match(
  sceneSource,
  /import \{[\s\S]*HEAT_CAPACITY_QUALITY_PROFILES[\s\S]*type HeatCapacityQualityMode[\s\S]*\} from '\.\/heatCapacityQualityProfiles';/,
  'Heat Capacity scene should consume the single quality profile module',
);
assert.match(
  sceneSource,
  /performanceMode: HeatCapacityQualityMode;/,
  'Heat Capacity scene should accept the new quality mode type',
);
assert.match(
  sceneSource,
  /const qualityProfile = HEAT_CAPACITY_QUALITY_PROFILES\[props\.performanceMode\];/,
  'Heat Capacity scene should derive one active render profile',
);
assert.match(
  sceneSource,
  /const cameraViewScheme = useMemo\(\(\) => getCameraViewScheme\(qualityProfile\), \[qualityProfile\]\)/,
  'camera scheme selection should use render model semantics instead of tier-name checks',
);
assert.match(
  sceneSource,
  /dpr:\s*qualityProfile\.dpr[\s\S]*frameloop:\s*qualityProfile\.frameLoop/,
  'Canvas DPR and frame loop should come from the active profile',
);
assert.match(
  sceneSource,
  /const instrumentSceneContent = qualityProfile\.renderModel === 'ultraGlb'/,
  'GLB rendering should be selected by profile model kind',
);
assert.match(
  sceneSource,
  /qualityProfile\.renderModel === 'procedural' \? \([\s\S]*<HeatCapacityGuideProjectionBridge/,
  'procedural guide projection should be selected by profile model kind',
);
assert.match(
  sceneSource,
  /highClarityMode = props\.qualityProfile\.highClarityProcedural/,
  'procedural high-clarity extras should be driven by profile configuration',
);
assert.doesNotMatch(
  sceneSource,
  /props\.performanceMode === 'standard'|props\.performanceMode === 'performance'|props\.performanceMode === 'balanced'|props\.performanceMode === 'ultra'/,
  'Heat Capacity scene should not keep old tier-name render branches',
);
assert.doesNotMatch(
  ultraModelSource,
  /useGLTF\.preload\(ULTRA_GLB_PATH\)/,
  'GLB model loading should not run as a module-level preload because procedural tiers must not request the GLB asset',
);

assert.match(styleSource, /studio-settings-performance-segmented-lowLoad/, 'quality segmented CSS should position the low-load tier');
assert.match(styleSource, /studio-settings-performance-segmented-highPerformance/, 'quality segmented CSS should position the high-performance tier');
assert.doesNotMatch(styleSource, /studio-settings-performance-segmented-standard|studio-settings-performance-segmented-performance|studio-settings-performance-switch|studio-settings-performance-toggle/, 'old performance segmented and switch CSS should be removed');

console.log('heatCapacityQualityProfiles tests passed');

assert.match(workbenchSource, /useWorkbenchHeatCapacityController\(\{/); assert.match(heatControllerSource, /useWorkbenchHeatSceneState\(\{/); assert.match(heatControllerSource, /useWorkbenchHeatRealtimeClock\(\{/); assert.match(workbenchSource, /deriveWorkbenchHeatSceneVisuals\(\{[\s\S]*heatCapacityQualityProfile/);
