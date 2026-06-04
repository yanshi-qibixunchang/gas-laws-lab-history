import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const scenePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const ultraModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx');
const runtimeGlbPath = join(process.cwd(), 'public', 'models', 'heat-capacity', 'fd-ncd-c-ultra.glb');
const workbenchPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx');

assert.equal(existsSync(runtimeGlbPath), true, 'Ultra GLB runtime asset should be available under public/models');
assert.equal(existsSync(ultraModelPath), true, 'Ultra GLB adapter component should exist');

const sceneSource = readFileSync(scenePath, 'utf8');
const ultraModelSource = readFileSync(ultraModelPath, 'utf8');
const workbenchSource = readFileSync(workbenchPath, 'utf8');

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
assert.match(
  sceneSource,
  /<HeatCapacityUltraModelErrorBoundary fallback=\{proceduralSceneContent\}>[\s\S]*<Suspense fallback=\{proceduralSceneContent\}>/,
  'Ultra GLB should retain the procedural fallback when the model fails or is still loading',
);

[
  'fd-ncd-c-ultra.glb',
  'FD_NCD_C_PowerSwitch_Base',
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_ZeroAdjustKnob',
  'Stopcock_Pivot',
  'InletValue_Pivot',
  'Pump_Bulb',
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_PressureGauge_NeedlePivot',
  'HSL_Stopcock_OpenPath_Glow',
  'HSL_Stopcock_ClosedBlocker_Mark',
].forEach((requiredToken) => {
  assert.match(
    ultraModelSource,
    new RegExp(requiredToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB display adapter should bind ${requiredToken}`,
  );
});

assert.match(
  ultraModelSource,
  /getPressureGaugeNeedleRotation[\s\S]*modelPressureGaugeAngleToVisualAngle/,
  'Ultra pressure gauge needle should reuse the shared pressure gauge contract mapping',
);
assert.match(
  ultraModelSource,
  /const ultraDisplayPowered = props\.powerOn;[\s\S]*const temperatureDisplay = ultraDisplayPowered \? formatAlignedSignalParts\(props\.temperatureSignalMv\) : null[\s\S]*const pressureDisplay = ultraDisplayPowered \? formatAlignedSignalParts\(props\.pressureSignalMv\) : null/,
  'Ultra digital display should blank both signal rows when power is off',
);
assert.match(
  ultraModelSource,
  /const formatAlignedSignalParts = \(value: number \| null\)[\s\S]*padStart\(4, ' '\)[\s\S]*right: `\.\$\{fractionalPart\} mV`/,
  'Ultra digital display should reserve a sign slot, four integer slots, decimal point, two decimals, and unit',
);
assert.match(
  ultraModelSource,
  /const drawUltraAlignedSignal = \([\s\S]*context\.measureText\('\+9999'\)[\s\S]*context\.measureText\('\.99 mV'\)[\s\S]*const decimalX = Math\.round\(\(canvasWidth - leftWidth - rightWidth\) \/ 2 \+ leftWidth\)[\s\S]*context\.textAlign = 'right'[\s\S]*context\.textAlign = 'left'/,
  'Ultra digital display should center the full numeric field while aligning both rows at the decimal point',
);
assert.match(
  ultraModelSource,
  /ULTRA_DISPLAY_TEXTURE_SURFACE_NODE_NAMES[\s\S]*HSL_MainDisplay_DynamicPlaneAnchor[\s\S]*HSL_MainDisplay_PixelDigits_PowerOnPreview[\s\S]*applyUltraDisplayTexture/,
  'Ultra digital display texture should bind the real GLB preview-digit surface, not only the empty dynamic anchor',
);
assert.match(
  ultraModelSource,
  /ULTRA_POWERED_DISPLAY_ART_NODE_NAMES[\s\S]*HSL_MainDisplay_PixelDigits_PowerOnPreview[\s\S]*setUltraPoweredDisplayArtVisible\(nodeMap,\s*ultraDisplayPowered\)/,
  'Ultra powered display should hide only the right-side numeric signal art with the power state',
);
assert.doesNotMatch(
  ultraModelSource.match(/const ULTRA_POWERED_DISPLAY_ART_NODE_NAMES[\s\S]*?\] as const;/)?.[0] ?? '',
  /HSL_MainDisplay_NameplateLabelArt_PowerPreview/,
  'Ultra left-side display nameplate and U-channel symbols should stay permanently visible instead of following the power state',
);
assert.match(
  ultraModelSource,
  /const texture = new THREE\.CanvasTexture\(canvas\);\s*texture\.flipY = false;/,
  'Ultra dynamic display texture should compensate GLB UV orientation so the live readout is not flipped',
);
assert.match(
  ultraModelSource,
  /STOPCOCK_VISUAL_SMOOTHING_RATE[\s\S]*PUMP_VALVE_VISUAL_SMOOTHING_RATE[\s\S]*POWER_SWITCH_VISUAL_SMOOTHING_RATE/,
  'Ultra visual state may keep model-side smoothing for read-only state updates',
);
assert.match(
  ultraModelSource,
  /const PUMP_VALVE_VISUAL_SMOOTHING_RATE = 5\.6;/,
  'Ultra pump valve should use a slower visual damping rate than the other small controls',
);
assert.match(
  ultraModelSource,
  /const ULTRA_THEME_VISUALS[\s\S]*light:[\s\S]*benchSurface: '#5f6f79'[\s\S]*benchBackstop: '#4d5d66'[\s\S]*instrumentBody: '#e0e5e7'[\s\S]*frontPanel: '#c2ccd0'[\s\S]*powerSwitchOff: '#d9534f'[\s\S]*powerSwitchOn: '#2ec978'[\s\S]*dark:[\s\S]*benchSurface: '#8fa1aa'[\s\S]*benchBackstop: '#7f929b'[\s\S]*instrumentBody: '#d5dcdf'[\s\S]*frontPanel: '#b8c3c8'[\s\S]*powerSwitchOff: '#e15d59'[\s\S]*powerSwitchOn: '#35d987'/,
  'Ultra GLB should define separate light and dark visual palettes with a lightened front panel and readable switch colors',
);
assert.match(
  ultraModelSource,
  /applyUltraThemeVisuals\(nodeMap,\s*baseTransforms,\s*props\.sceneTheme\)/,
  'Ultra GLB should apply runtime material overrides from the current scene theme',
);
[
  'clean_lab_bench',
  'HSL_LabBench_Backstop_LowLip',
  'FD_NCD_C_InstrumentBody',
  'FD_NCD_C_FrontPanel',
  'FD_NCD_C_PowerSwitch_Base',
  'HSL_MainDisplay_RecessWell',
  'HSL_MainDisplay_NameplateZone',
  'HSL_PowerSwitch_Inset_Frame_Lip',
  'Stopcock_GlassBulgedBody',
  'Stopcock_RotatingPlugCore',
  'HSL_Stopcock_FlowChannel',
  'Stopcock_HandleStem',
].forEach((themedNodeName) => {
  assert.match(
    ultraModelSource,
    new RegExp(themedNodeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB theme overrides should include ${themedNodeName}`,
  );
});
assert.match(
  ultraModelSource,
  /const POWER_SWITCH_VISUAL_SCALE = new THREE\.Vector3\(1\.28,\s*1\.28,\s*1\.08\);[\s\S]*const POWER_SWITCH_BASE_VISUAL_SCALE = new THREE\.Vector3\(1\.22,\s*1\.24,\s*1\.03\);[\s\S]*const POWER_SWITCH_FRAME_VISUAL_SCALE = new THREE\.Vector3\(1\.24,\s*1\.26,\s*1\.03\);[\s\S]*const POWER_SWITCH_PIVOT_OFFSET = new THREE\.Vector3\(0,\s*0,\s*0\.0042\);/,
  'Ultra power switch should be scaled back so it does not visually crowd the pressure-zero knob',
);
assert.match(
  ultraModelSource,
  /POWER_SWITCH_ROCKER_FACE_Z[\s\S]*POWER_SWITCH_ROCKER_FACE_CROWN_Z[\s\S]*POWER_SWITCH_ROCKER_CORNER_RADIUS[\s\S]*POWER_SWITCH_ROCKER_BACK_Z[\s\S]*POWER_SWITCH_ROCKER_SKIRT_DEPTH[\s\S]*createUltraPowerSwitchRockerGeometry[\s\S]*getUltraPowerSwitchHalfWidthAtY[\s\S]*getUltraPowerSwitchFaceZ[\s\S]*computeVertexNormals/,
  'Ultra power switch should render a rounded, lightly curved boat-rocker cap with a long skirt that covers the panel slot',
);
assert.match(
  ultraModelSource,
  /const POWER_SWITCH_ROCKER_SKIRT_DEPTH = 0\.006;[\s\S]*halfHeight - POWER_SWITCH_ROCKER_SKIRT_DEPTH \* \(1 - Math\.cos\(theta\)\)/,
  'Ultra power switch skirt should drop behind the opening with only a small inward tuck so the raised side does not reveal a wide slot',
);
assert.match(
  ultraModelSource,
  /createUltraPowerSwitchRingInlayGeometry[\s\S]*new THREE\.Shape\(\)[\s\S]*shape\.holes\.push\(hole\)/,
  'Ultra power switch ring mark should be generated as a flat inlay shape',
);
assert.match(
  ultraModelSource,
  /setUltraNodeTreeVisible\(nodeMap,\s*'FD_NCD_C_PowerSwitch_Button',\s*false\)[\s\S]*setUltraNodeTreeVisible\(nodeMap,\s*'HSL_PowerSwitch_Mark_I_Inlay',\s*false\)[\s\S]*setUltraNodeTreeVisible\(nodeMap,\s*'HSL_PowerSwitch_Mark_O_Inlay',\s*false\)/,
  'Ultra power switch should hide the original rectangular GLB button and GLB I/O marks behind the runtime curved rocker',
);
[
  'FD_NCD_C_PowerSwitch_Button',
  'HSL_PowerSwitch_Mark_I_Inlay',
  'HSL_PowerSwitch_Mark_O_Inlay',
].forEach((hiddenOriginalNodeName) => {
  assert.doesNotMatch(
    ultraModelSource,
    new RegExp(`setUltraNodeOwnMaterialColor\\(nodeMap,\\s*'${hiddenOriginalNodeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
    `Ultra GLB should not keep dead material overrides for hidden original power-switch node ${hiddenOriginalNodeName}`,
  );
});
assert.doesNotMatch(
  ultraModelSource,
  /applyUltraThemeVisuals\(nodeMap,\s*baseTransforms,\s*props\.sceneTheme,\s*props\.powerOn\)/,
  'Ultra theme visuals should not rerun for power state after hidden original switch styling was removed',
);
assert.match(
  ultraModelSource,
  /const POWER_SWITCH_FRAME_VISUAL_SCALE = new THREE\.Vector3\(1\.24,\s*1\.26,\s*1\.03\);[\s\S]*HSL_PowerSwitch_Inset_Frame_Lip[\s\S]*POWER_SWITCH_FRAME_VISUAL_SCALE/,
  'Ultra power switch panel frame should stay just larger than the smaller rocker so it does not expose a slot gap or crowd adjacent controls',
);
assert.match(
  ultraModelSource,
  /HSL_PowerSwitch_SkirtedRockerMarkI[\s\S]*<planeGeometry[\s\S]*HSL_PowerSwitch_SkirtedRockerMarkO[\s\S]*geometry=\{ringInlayGeometry\}/,
  'Ultra power switch I/O marks should be flat inlays on the rocker face, not protruding 3D geometry',
);
assert.doesNotMatch(
  ultraModelSource,
  /HSL_PowerSwitch_SkirtedRockerMarkI[\s\S]*<boxGeometry|HSL_PowerSwitch_SkirtedRockerMarkO[\s\S]*<torusGeometry/,
  'Ultra power switch I/O marks should not use protruding box or torus geometry',
);
assert.match(
  ultraModelSource,
  /<UltraPowerSwitchSkirtedRocker[\s\S]*powerOn=\{props\.powerOn\}[\s\S]*hovered=\{props\.hoveredControl === 'powerSwitch'\}/,
  'Ultra power switch skirted rocker should follow the live power state and hover feedback',
);
assert.match(
  ultraModelSource,
  /const POWER_SWITCH_HITBOX_SIZE: \[number, number, number\] = \[0\.36,\s*0\.52,\s*0\.26\];[\s\S]*powerSwitch', anchorNodeName: 'FD_NCD_C_PowerSwitch_Base', size: POWER_SWITCH_HITBOX_SIZE, offset: \[0\.018,\s*-0\.006,\s*0\.16\]/,
  'Ultra power switch hitbox should stay narrow, extend over the visible rocker face, and use the fixed switch base so both power states click consistently',
);
assert.match(
  ultraModelSource,
  /FD_NCD_C_PowerSwitch_Base', size: POWER_SWITCH_HITBOX_SIZE/,
  'Ultra power switch hitbox should use the stable panel-base transform instead of rotating with the rocker cap',
);
assert.match(
  ultraModelSource,
  /const isUltraPrimaryPointerButton = \(event: ThreeEvent<PointerEvent \| MouseEvent>\) => event\.nativeEvent\.button === 0;/,
  'Ultra control hitboxes should distinguish left-click control actions from right-button camera panning',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlPointerDown = useCallback\([\s\S]*if \(!isUltraPrimaryPointerButton\(event\)\) return;[\s\S]*absorbUltraPointerEvent\(event\)/,
  'Ultra control hitboxes should let right pointer-down events pass through to OrbitControls before absorbing left-button events',
);
assert.doesNotMatch(
  ultraModelSource.match(/const handleUltraControlPointerOver[\s\S]*?const handleUltraControlPointerOut/)?.[0] ?? '',
  /absorbUltraPointerEvent/,
  'Ultra hover feedback should not stop propagation because that can interfere with camera controls over hitboxes',
);
assert.doesNotMatch(
  ultraModelSource,
  /handleUltraControlWheel|onWheel=\{handleUltraControlWheel\}|onWheel\?:|onWheel=\{\(event\) => onWheel/,
  'Ultra control hitboxes should not handle wheel events; wheel zoom must ignore all left-click hitboxes',
);
assert.match(
  ultraModelSource,
  /HSL_PowerSwitch_SkirtedRockerShell[\s\S]*roughness=\{0\.18\}[\s\S]*clearcoat=\{0\.6\}[\s\S]*clearcoatRoughness=\{0\.08\}[\s\S]*specularIntensity=\{0\.82\}/,
  'Ultra power switch shell should use a glossier plastic material for a more realistic rocker texture',
);
assert.match(
  ultraModelSource,
  /const dampUltraControlAngle = \([\s\S]*THREE\.MathUtils\.damp/,
  'Ultra control animations should share the same damped motion helper so open and close use symmetric smoothing',
);
assert.match(
  ultraModelSource,
  /const getUltraStopcockVisualAngleRad = \(angleDeg: number\) => -THREE\.MathUtils\.degToRad\(angleDeg\);[\s\S]*const stopcockTargetAngle = getUltraStopcockVisualAngleRad\(props\.stopcockAngleDeg\);/,
  'Ultra glass stopcock should reverse only the GLB visual rotation direction while keeping the shared logical angle',
);
assert.match(
  ultraModelSource,
  /const ULTRA_CONTROL_MOTION_INVALIDATION_MS = 9\d{2};/,
  'Ultra control animation invalidation should stay active long enough for both forward and reverse transitions',
);
assert.match(
  ultraModelSource,
  /POWER_SWITCH_OFF_ROTATION_RAD[\s\S]*POWER_SWITCH_ON_ROTATION_RAD[\s\S]*applyLocalAxisRotationAroundPivot\([\s\S]*'FD_NCD_C_PowerSwitch_Button'[\s\S]*new THREE\.Vector3\(1, 0, 0\)[\s\S]*POWER_SWITCH_PIVOT_OFFSET[\s\S]*powerSwitchDisplayedRotationRef\.current/,
  'Ultra power switch should rotate as a center-pivot rocker instead of around the mesh origin',
);
assert.match(
  ultraModelSource,
  /applyLocalAxisRotation\([\s\S]*'FD_NCD_C_ZeroAdjustKnob'[\s\S]*new THREE\.Vector3\(0, 1, 0\)[\s\S]*pressureZeroDisplayedAngleRef\.current/,
  'Ultra pressure-zero knob should rotate around the panel-normal axis through the knob center',
);
assert.match(
  sceneSource,
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*position: \[0\.58,\s*3\.05,\s*6\.25\][\s\S]*target: \[0\.02,\s*0\.52,\s*0\.02\]/,
  'Ultra default view should be closer, more frontal, and slightly lower in the viewport',
);
assert.match(
  sceneSource,
  /camera: \{ position: cameraViewScheme\.defaultView\.position, fov: props\.performanceMode === 'ultra' \? 36 : 38 \}/,
  'Ultra mode should use a narrower default FOV for the closer reference view',
);
assert.match(
  ultraModelSource,
  /HSL_Stopcock_OpenPath_Glow'[\s\S]*HSL_Stopcock_ClosedBlocker_Mark'[\s\S]*openPathGlow\.visible = stopcockOpen[\s\S]*closedBlockerMark\.visible = !stopcockOpen/,
  'Ultra stopcock open/check and closed/cross markers should be mutually exclusive and tied to the actual stopcock state',
);

[
  'NATIVE_CONTROL_SINGLE_CLICK_DELAY_MS',
  'PUMP_VALVE_OVERLAP_PRIORITY_DISTANCE_EPSILON',
  'gl.domElement.addEventListener',
].forEach((forbiddenToken) => {
  assert.doesNotMatch(
    ultraModelSource,
    new RegExp(forbiddenToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB display adapter should not keep deferred interaction token ${forbiddenToken}`,
  );
});

[
  'onPowerToggle',
  'onStopcockOpenChange',
  'onPressureZeroFineAdjust',
  'onPressureZeroCoarseAdjust',
  'onPumpValveToggle',
  'onPumpBulbPress',
  'onLockedInteraction',
].forEach((forbiddenProp) => {
  assert.match(
    ultraModelSource,
    new RegExp(`${forbiddenProp}[?:]`),
    `Ultra GLB props should expose ${forbiddenProp} for the interactive hitbox layer`,
  );
});

assert.match(
  ultraModelSource,
  /type UltraPointerControl = 'powerSwitch' \| 'pressureZero' \| 'stopcock' \| 'pumpValve' \| 'pumpBulb';/,
  'Ultra GLB should define the same five direct control targets as the procedural model',
);
assert.match(
  ultraModelSource,
  /ULTRA_CONTROL_HITBOXES[\s\S]*powerSwitch[\s\S]*FD_NCD_C_PowerSwitch_Base[\s\S]*pressureZero[\s\S]*FD_NCD_C_ZeroAdjustKnob[\s\S]*stopcock[\s\S]*Stopcock_Pivot[\s\S]*pumpValve[\s\S]*InletValue_Pivot[\s\S]*pumpBulb[\s\S]*Pump_Bulb/,
  'Ultra GLB hitboxes should be anchored to GLB nodes, with the power switch using the fixed base so its click area stays stable across both rocker states',
);
assert.match(
  ultraModelSource,
  /function UltraNodeHitbox[\s\S]*anchorNodeName[\s\S]*parentRef[\s\S]*updateMatrixWorld\(true\)[\s\S]*copy\(anchor\.matrixWorld\)[\s\S]*matrixAutoUpdate=\{false\}/,
  'Ultra GLB hitboxes should copy the current GLB node matrix so model and camera rotations stay aligned',
);
assert.match(
  ultraModelSource,
  /name=\{`HSL_UltraMeshHitbox_\$\{definition\.control\}`\}/,
  'Ultra GLB hitboxes should use stable names for debugging and future tests',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*interactionLocked=\{props\.interactionLocked\}[\s\S]*onLockedInteraction=\{props\.onLockedInteraction\}[\s\S]*onPowerToggle=\{props\.onPowerToggle\}[\s\S]*onStopcockOpenChange=\{props\.onStopcockOpenChange\}[\s\S]*onPressureZeroFineAdjust=\{props\.onPressureZeroFineAdjust\}[\s\S]*onPressureZeroCoarseAdjust=\{props\.onPressureZeroCoarseAdjust\}[\s\S]*onPumpValveToggle=\{props\.onPumpValveToggle\}[\s\S]*onPumpBulbPress=\{props\.onPumpBulbPress\}/,
  'Heat Capacity scene should pass the shared procedural control callbacks into the Ultra GLB hitbox layer',
);

assert.doesNotMatch(
  sceneSource,
  /ULTRA_FOCUS_VIEWS/,
  'Ultra mode should not keep dedicated focus camera views while focus integration is deferred',
);
assert.doesNotMatch(
  sceneSource,
  /focusViews=\{props\.performanceMode === 'ultra'\s*\?\s*ULTRA_FOCUS_VIEWS\s*:\s*PROCEDURAL_FOCUS_VIEWS\}/,
  'Camera rig should not switch to Ultra-specific focus views while focus integration is deferred',
);
assert.match(
  sceneSource,
  /const orbitControlsEnabled = props\.performanceMode === 'ultra'\s*\?\s*true\s*:\s*focusMode === 'none' && !props\.interactionLocked;/,
  'Ultra mode should keep orbit controls available while demo, guide, and focus integration are deferred',
);
assert.match(
  workbenchSource,
  /const heatCapacityUltraModelIntegrationReady = false;/,
  'Workbench should keep an explicit gate for temporarily disabling Demo and Guide while Ultra GLB model integration is incomplete',
);
assert.match(
  workbenchSource,
  /const heatCapacityTeachingModesAvailable = settingsPerformanceMode !== 'ultra' \|\| heatCapacityUltraModelIntegrationReady;/,
  'Workbench should keep Demo and Guide available for procedural skeleton modes while Ultra GLB integration is incomplete',
);
assert.match(
  workbenchSource,
  /heatCapacityTeachingModesAvailable \? runHeatCapacityAutoDemo\(\) : enterHeatCapacityFreeMode\(\)/,
  'Demo mode should run for procedural skeleton modes and route back to Free mode for deferred Ultra GLB mode',
);
assert.match(
  workbenchSource,
  /heatCapacityTeachingModesAvailable \? startHeatCapacityManualExperiment\(\) : enterHeatCapacityFreeMode\(\)/,
  'Guide mode should run for procedural skeleton modes and route back to Free mode for deferred Ultra GLB mode',
);
assert.match(
  workbenchSource,
  /if \(heatCapacityTeachingModesAvailable\) return;[\s\S]*activeFile\.kind !== 'heatCapacity' \|\| activeFile\.heatCapacityMode === 'free'[\s\S]*enterHeatCapacityFreeMode\(\);/,
  'Workbench should normalize stale Demo or Guide heat-capacity files back to Free mode only while the active model cannot support those modes',
);
assert.match(
  workbenchSource,
  /const heatCapacityDeferredModeDisabled = !heatCapacityTeachingModesAvailable;/,
  'Mode buttons should only be disabled when the active heat-capacity model cannot support Demo or Guide',
);
assert.doesNotMatch(
  workbenchSource,
  /const heatCapacityDeferredModeDisabled = !heatCapacityUltraModelIntegrationReady;/,
  'Mode buttons should not stay globally disabled just because Ultra GLB mode is still deferred',
);

console.log('heatCapacityUltraGlbIntegration tests passed');
