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
  /const POWER_SWITCH_HITBOX_SIZE: \[number, number, number\] = \[0\.42,\s*0\.58,\s*0\.30\];[\s\S]*powerSwitch', anchorNodeName: 'FD_NCD_C_PowerSwitch_Base', size: POWER_SWITCH_HITBOX_SIZE, offset: \[0\.018,\s*-0\.006,\s*0\.16\]/,
  'Ultra power switch hitbox should stay local to the rocker, grow slightly for easier clicks, and use the fixed switch base so both power states click consistently',
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
assert.match(
  ultraModelSource,
  /const projectUltraControlHitboxCenter = useCallback\([\s\S]*definition\.offset[\s\S]*applyMatrix4\(anchor\.matrixWorld\)[\s\S]*position\.project\(camera\)/,
  'Ultra GLB control disambiguation should project hitbox centers, not raw screen constants, so resized canvases and orbit angles stay aligned',
);
assert.match(
  ultraModelSource,
  /const resolveUltraPanelPointerControl = useCallback\([\s\S]*projectUltraControlHitboxCenter\('powerSwitch'\)[\s\S]*projectUltraControlHitboxCenter\('pressureZero'\)[\s\S]*getUltraScreenDistanceSq\([\s\S]*return zeroDistanceSq < powerDistanceSq \? 'pressureZero' : 'powerSwitch'/,
  'Ultra GLB should resolve the adjacent power switch and zero knob by pointer distance to their projected hitbox centers',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlClick = useCallback\([\s\S]*const panelResolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\)[\s\S]*const resolvedControl = panelResolvedControl === 'pumpValve'/,
  'Ultra GLB clicks should use the same panel disambiguation before dispatching power-switch and zero-knob behavior',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlPointerDown = useCallback\([\s\S]*const resolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\)[\s\S]*if \(resolvedControl !== 'pressureZero'\)/,
  'Ultra GLB pressure-zero dragging should still start when the ray first hits the neighboring power-switch box but the pointer is closer to the knob',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlPointerOver = useCallback\([\s\S]*const resolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\)[\s\S]*props\.setHoveredControl\(resolvedControl\)/,
  'Ultra GLB hover should show the control selected by panel disambiguation instead of whichever adjacent transparent box was hit first',
);
assert.match(
  ultraModelSource,
  /onPointerMove\?: \(control: UltraPointerControl, event: ThreeEvent<PointerEvent>\) => void;[\s\S]*onPointerMove=\{\(event\) => onPointerMove\?\.\(definition\.control, event\)\}/,
  'Ultra GLB hitboxes should forward pointer-move events so adjacent controls can be re-resolved without leaving the current transparent box',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlPointerMove = useCallback\([\s\S]*const resolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\)[\s\S]*if \(props\.hoveredControl !== resolvedControl\)[\s\S]*props\.setHoveredControl\(resolvedControl\)/,
  'Ultra GLB pointer movement should continuously re-resolve power-switch versus zero-knob hover so the selected control is not determined by entry direction',
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
  /const baseShellColor = powerOn \? themeVisuals\.powerSwitchOn : themeVisuals\.powerSwitchOff;[\s\S]*const shellColor = hovered[\s\S]*getUltraNaturalHighlightColor\(new THREE\.Color\(baseShellColor\), 0\.28, 0\.075\)[\s\S]*HSL_PowerSwitch_SkirtedRockerShell[\s\S]*roughness=\{0\.18\}[\s\S]*emissiveIntensity=\{hovered \? 0\.34 : powerOn \? 0\.08 : 0\.035\}/,
  'Ultra power switch shell should keep its base red/green hue, preserve its markings, and brighten clearly on hover',
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
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*position: \[0\.58,\s*3\.05,\s*6\.25\][\s\S]*target: \[0\.02,\s*0\.52,\s*0\.02\][\s\S]*fov: 36[\s\S]*responsiveFov:[\s\S]*aspect: 1\.35[\s\S]*narrowAspect: 0\.95[\s\S]*fov: 52[\s\S]*wideAspect: 3[\s\S]*wideFov: 56/,
  'Ultra default view should keep its approved close framing while widening FOV for narrow and wide-short resized canvases',
);
assert.match(
  sceneSource,
  /camera: \{ position: cameraViewScheme\.defaultView\.position, fov: cameraViewScheme\.fov \}/,
  'Canvas should use the active scheme initial FOV before CameraRig applies aspect-responsive updates',
);
assert.match(
  sceneSource,
  /const getCameraFovForAspect = \(cameraViewScheme: CameraViewScheme, aspect: number\)[\s\S]*responsiveFov[\s\S]*THREE\.MathUtils\.lerp\(cameraViewScheme\.fov, responsiveFov\.fov, t\)[\s\S]*responsiveFov\.wideAspect[\s\S]*THREE\.MathUtils\.lerp\(cameraViewScheme\.fov, responsiveFov\.wideFov, wideT\)/,
  'CameraRig should derive Ultra FOV from canvas aspect instead of a fixed screen-size assumption',
);
assert.match(
  sceneSource,
  /camera\.fov = nextFov;[\s\S]*camera\.updateProjectionMatrix\(\);[\s\S]*invalidate\(\);/,
  'CameraRig should update the projection matrix when sidebar resizing changes the canvas aspect',
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
  /ULTRA_CONTROL_HITBOXES[\s\S]*powerSwitch[\s\S]*FD_NCD_C_PowerSwitch_Base[\s\S]*pressureZero[\s\S]*FD_NCD_C_ZeroAdjustKnob[\s\S]*stopcock[\s\S]*Stopcock_THandle[\s\S]*pumpValve[\s\S]*InletValue_Pivot[\s\S]*pumpBulb[\s\S]*Pump_Bulb/,
  'Ultra GLB hitboxes should be anchored to GLB nodes, with the switch on a stable base and the stopcock on its handle only',
);
assert.match(
  ultraModelSource,
  /const POWER_SWITCH_HITBOX_SIZE: \[number, number, number\] = \[0\.42, 0\.58, 0\.30\];/,
  'Ultra power-switch hitbox should be slightly larger while still staying local to the rocker area',
);
assert.match(
  ultraModelSource,
  /control: 'stopcock', anchorNodeName: 'Stopcock_THandle', size: \[0\.46, 0\.24, 0\.28\]/,
  'Ultra stopcock hitbox should target the handle instead of the linked glass assembly',
);
assert.match(
  ultraModelSource,
  /control: 'pumpValve', anchorNodeName: 'InletValue_Pivot', size: \[0\.64, 0\.52, 0\.38\]/,
  'Ultra pump-valve hitbox should be only slightly larger so it does not steal stopcock-handle clicks',
);
assert.match(
  ultraModelSource,
  /control: 'pumpBulb', anchorNodeName: 'Pump_Bulb', size: \[0\.96, 0\.72, 0\.64\]/,
  'Ultra pump-bulb hitbox should stay smaller than the legacy oversized area while remaining reachable in narrow layouts',
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
assert.match(
  ultraModelSource,
  /const panelResolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\);[\s\S]*const resolvedControl = panelResolvedControl === 'pumpValve' && props\.hoveredControl === 'stopcock'\s*\?\s*'stopcock'\s*:\s*panelResolvedControl;[\s\S]*if \(resolvedControl === 'powerSwitch'\)[\s\S]*else if \(resolvedControl === 'stopcock'\)[\s\S]*else if \(resolvedControl === 'pumpValve'\)/,
  'Ultra GLB valve clicks should honor the current hover target so pump-valve depth does not steal stopcock-handle clicks',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*demoFocusControlId=\{props\.demoFocusControlId\}[\s\S]*demoFocusPulseActive=\{props\.demoFocusPulseActive\}[\s\S]*interactionQualityReduced=\{interactionQualityReduced\}[\s\S]*visualEffects=\{\{[\s\S]*demoHaloColor: scenePalette\.effects\.demoHalo[\s\S]*nonBulbHoverHaloOpacity: scenePalette\.effects\.nonBulbHoverHaloOpacity[\s\S]*pumpBulbHoverHaloOpacity: scenePalette\.effects\.pumpBulbHoverHaloOpacity/,
  'Heat Capacity scene should pass the procedural demo/guide pulse palette into the Ultra GLB visual layer',
);
assert.match(
  sceneSource,
  /const sceneShouldAnimate =[\s\S]*props\.demoFocusPulseActive[\s\S]*Boolean\(props\.manualRollbackAnimation\)/,
  'Ultra GLB guide/demo focus halos should keep the demand-rendered canvas invalidating while they pulse',
);

assert.match(
  ultraModelSource,
  /type UltraFocusControl = UltraPointerControl \| 'instrumentPressureDisplay' \| 'instrumentTemperatureDisplay' \| 'instrumentPanel';/,
  'Ultra GLB should accept the same direct and instrument-panel focus ids used by the procedural skeleton',
);
assert.match(
  ultraModelSource,
  /type UltraVisualTargetId = UltraFocusControl;/,
  'Ultra visual targets should use the same focus id space instead of a separate screen-coordinate contract',
);
assert.match(
  ultraModelSource,
  /const ULTRA_CONTROL_VISUAL_TARGETS[\s\S]*id: 'powerSwitch'[\s\S]*anchorNodeName: 'FD_NCD_C_PowerSwitch_Base'[\s\S]*id: 'pressureZero'[\s\S]*anchorNodeName: 'FD_NCD_C_ZeroAdjustKnob'[\s\S]*id: 'stopcock'[\s\S]*anchorNodeName: 'Stopcock_THandle'[\s\S]*id: 'pumpValve'[\s\S]*anchorNodeName: 'InletValue_Pivot'[\s\S]*id: 'pumpBulb'[\s\S]*anchorNodeName: 'Pump_Bulb'[\s\S]*id: 'instrumentPressureDisplay'[\s\S]*anchorNodeName: 'HSL_MainDisplay_DynamicPlaneAnchor'/,
  'Ultra GLB hover and guide/demo halos should be anchored to GLB nodes, including the pressure display surface',
);
assert.match(
  ultraModelSource,
  /focusControlIds: \['pressureZero', 'instrumentPressureDisplay'\]/,
  'Ultra pressure-zero focus should highlight both the GLB zero knob and pressure display like the procedural zeroing walkthrough',
);
assert.match(
  ultraModelSource,
  /function UltraNodeHalo[\s\S]*parentRef[\s\S]*updateMatrixWorld\(true\)[\s\S]*copy\(anchor\.matrixWorld\)[\s\S]*matrixAutoUpdate=\{false\}/,
  'Ultra visual halos should copy live GLB node matrices just like hitboxes so resize, sidebar, camera, and model transforms stay aligned',
);
assert.match(
  ultraModelSource,
  /type UltraControlVisualTarget[\s\S]*hoverScale\?: number;[\s\S]*hoverWireframe\?: boolean;/,
  'Ultra GLB visual target definitions should be able to shrink hover hints and render them as outlines instead of large filled masks',
);
assert.doesNotMatch(
  ultraModelSource,
  /id: 'powerSwitch'[\s\S]*hoverControl: 'powerSwitch'[\s\S]*focusControlIds: \['powerSwitch'\]/,
  'Ultra power-switch hover should rely on subtle material brightening instead of drawing a blue hover ring',
);
assert.doesNotMatch(
  ultraModelSource,
  /id: 'pressureZero'[\s\S]*hoverControl: 'pressureZero'[\s\S]*focusControlIds: \['pressureZero'\]/,
  'Ultra pressure-zero hover should rely on subtle material brightening instead of drawing a blue hover ring',
);
assert.match(
  ultraModelSource,
  /id: 'powerSwitch'[\s\S]*focusControlIds: \['powerSwitch'\][\s\S]*shape: 'torus'/,
  'Ultra power-switch focus target should remain available for guide and demo pulses after removing the hover ring',
);
assert.match(
  ultraModelSource,
  /id: 'pressureZero'[\s\S]*focusControlIds: \['pressureZero'\][\s\S]*shape: 'torus'/,
  'Ultra pressure-zero focus target should remain available for guide and demo pulses after removing the hover ring',
);
assert.match(
  ultraModelSource,
  /id: 'stopcock'[\s\S]*anchorNodeName: 'Stopcock_THandle'[\s\S]*size: \[0\.36, 0\.18, 0\.22\]/,
  'Ultra stopcock hover hint should visually follow the smaller handle-only hit area',
);
assert.match(
  ultraModelSource,
  /mesh\.scale\.setScalar\(focusMode \? 1 : target\.hoverScale \?\? 1\)/,
  'Ultra hover hints should use per-target shrink factors while guide/demo focus halos keep their original scale',
);
assert.match(
  ultraModelSource,
  /wireframe=\{mode === 'hover' && target\.hoverWireframe === true\}/,
  'Ultra hover hint materials should support outline rendering so the blue cue does not mask the GLB control surface',
);
assert.match(
  ultraModelSource,
  /type UltraMaterialHighlightControl = UltraPointerControl;[\s\S]*const ULTRA_CONTROL_MATERIAL_HIGHLIGHTS[\s\S]*control: 'pressureZero'[\s\S]*FD_NCD_C_ZeroAdjustKnob[\s\S]*control: 'stopcock'[\s\S]*Stopcock_RotatingRoundKnob[\s\S]*control: 'pumpValve'[\s\S]*InletValue_Pivot[\s\S]*control: 'pumpBulb'[\s\S]*Pump_Bulb/,
  'Ultra GLB should define entity-material hover highlights for each GLB interactive control instead of relying only on overlay halos',
);
assert.match(
  ultraModelSource,
  /const getUltraNaturalHighlightColor = \(baseColor: THREE\.Color, lightnessLift: number, saturationLift = 0\.02\) => \{[\s\S]*baseColor\.getHSL\(hsl\)[\s\S]*setHSL\([\s\S]*hsl\.h/,
  'Ultra GLB material highlights should derive hover colors from the original material hue instead of replacing controls with white overlay colors',
);
assert.match(
  ultraModelSource,
  /function applyUltraControlMaterialHighlights[\s\S]*snapshotMap[\s\S]*getUltraNaturalHighlightColor\(snapshot\.color, definition\.lightnessLift, definition\.saturationLift\)[\s\S]*restoreUltraMaterialSnapshot/,
  'Ultra material highlights should subtly brighten real GLB materials from stored snapshots and restore them when hover/focus leaves',
);
assert.match(
  ultraModelSource,
  /control: 'pressureZero'[\s\S]*lightnessLift: 0\.22[\s\S]*emissiveIntensity: 0\.11[\s\S]*control: 'stopcock'[\s\S]*lightnessLift: 0\.18[\s\S]*emissiveIntensity: 0\.09[\s\S]*control: 'pumpValve'[\s\S]*lightnessLift: 0\.22[\s\S]*emissiveIntensity: 0\.11[\s\S]*control: 'pumpBulb'[\s\S]*lightnessLift: 0\.22[\s\S]*emissiveIntensity: 0\.08/,
  'Ultra GLB hover material values should be strong enough to read as selected while preserving knob markers, switch labels, and material details',
);
assert.doesNotMatch(
  ultraModelSource,
  /#f7fbff|#ecfdff|#e8fbff|#ffdce8|#ff7772|#55f5a5|#ff817c|#65ffb0/,
  'Ultra GLB hover should not use the previous near-white or fluorescent replacement colors that washed out model details',
);
assert.match(
  ultraModelSource,
  /const activeUltraMaterialControls = useMemo\(\(\) => \{[\s\S]*props\.hoveredControl[\s\S]*props\.demoFocusPulseActive[\s\S]*isUltraPointerControl\(props\.demoFocusControlId\)/,
  'Ultra GLB material brightening should respond to both mouse hover and guide/demo focused controls',
);
assert.doesNotMatch(
  ultraModelSource.match(/const ULTRA_CONTROL_VISUAL_TARGETS[\s\S]*?\] as const;/)?.[0] ?? '',
  /window\.innerWidth|window\.innerHeight|clientWidth|clientHeight|getBoundingClientRect|canvas\.width|canvas\.height/,
  'Ultra visual halo target definitions should not depend on one screen size or DOM pixel coordinate system',
);

assert.doesNotMatch(
  sceneSource,
  /ULTRA_FOCUS_VIEWS/,
  'Ultra mode should not add dedicated focus camera views as part of GLB hover and teaching highlights',
);
assert.doesNotMatch(
  sceneSource,
  /focusViews=\{props\.performanceMode === 'ultra'\s*\?\s*ULTRA_FOCUS_VIEWS\s*:\s*PROCEDURAL_FOCUS_VIEWS\}/,
  'Camera rig should not switch to Ultra-specific focus views for GLB hover and teaching highlights',
);
assert.match(
  sceneSource,
  /const orbitControlsEnabled = props\.performanceMode === 'ultra'\s*\?\s*true\s*:\s*focusMode === 'none' && !props\.interactionLocked;/,
  'Ultra mode should keep orbit controls available while node-anchored GLB hitboxes and highlights handle controls',
);
assert.match(
  workbenchSource,
  /const heatCapacityUltraModelIntegrationReady = true;/,
  'Workbench should mark Ultra GLB model integration ready once GLB hover, guide, and demo highlights are node-anchored',
);
assert.match(
  workbenchSource,
  /const heatCapacityTeachingModesAvailable = settingsPerformanceMode !== 'ultra' \|\| heatCapacityUltraModelIntegrationReady;/,
  'Workbench should keep a single availability helper for both procedural and Ultra model teaching modes',
);
assert.match(
  workbenchSource,
  /heatCapacityTeachingModesAvailable \? runHeatCapacityAutoDemo\(\) : enterHeatCapacityFreeMode\(\)/,
  'Demo mode should run once the active Heat Capacity model supports teaching highlights',
);
assert.match(
  workbenchSource,
  /heatCapacityTeachingModesAvailable \? startHeatCapacityManualExperiment\(\) : enterHeatCapacityFreeMode\(\)/,
  'Guide mode should run once the active Heat Capacity model supports teaching highlights',
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
