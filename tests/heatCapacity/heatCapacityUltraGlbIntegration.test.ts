import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const scenePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const ultraModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx');
const hardSphereLayerPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityHardSphereLayer.tsx');
const runtimeGlbPath = join(process.cwd(), 'public', 'models', 'heat-capacity', 'fd-ncd-c-ultra.glb');
const workbenchPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx');

assert.equal(existsSync(runtimeGlbPath), true, 'Ultra GLB runtime asset should be available under public/models');
assert.equal(existsSync(ultraModelPath), true, 'Ultra GLB adapter component should exist');

const sceneSource = readFileSync(scenePath, 'utf8');
const ultraModelSource = readFileSync(ultraModelPath, 'utf8');
const hardSphereLayerSource = readFileSync(hardSphereLayerPath, 'utf8');
const workbenchSource = readFileSync(workbenchPath, 'utf8');
const runtimeGlbBinary = readFileSync(runtimeGlbPath);

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
assert.match(
  ultraModelSource,
  /const ULTRA_GLB_PATH = `\$\{import\.meta\.env\.BASE_URL\}models\/heat-capacity\/fd-ncd-c-ultra\.glb`;/,
  'Ultra GLB should resolve through Vite BASE_URL so the packaged desktop file:// app loads dist/models instead of file-system root /models',
);
assert.doesNotMatch(
  ultraModelSource,
  /const ULTRA_GLB_PATH = ['"]\/models\/heat-capacity\/fd-ncd-c-ultra\.glb['"]/,
  'Ultra GLB should not use an absolute /models path because packaged Electron resolves it outside the app dist folder',
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
  'glass_bottle_inner_air',
].forEach((requiredToken) => {
  assert.match(
    requiredToken === 'glass_bottle_inner_air' ? runtimeGlbBinary.toString('utf8') : ultraModelSource,
    new RegExp(requiredToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB display adapter should bind ${requiredToken}`,
  );
});

assert.match(
  sceneSource,
  /const hardSphereViewActive = props\.hardSphereViewEnabled;/,
  'Ultra GLB should be able to display the hard-sphere visualization instead of forcing it off by performance tier',
);
assert.match(
  ultraModelSource,
  /<HeatCapacityHardSphereLayer[\s\S]*containerProfile="ultra-cylinder"/,
  'Ultra GLB should mount hard spheres in the measured cylinder profile',
);
assert.doesNotMatch(
  ultraModelSource,
  /motionMode=/,
  'Ultra GLB should not pass the retired hard-sphere breakpoint motion mode',
);
assert.match(
  hardSphereLayerSource,
  /const ULTRA_HARD_SPHERE_CYLINDER_CENTER = new THREE\.Vector3\(-1\.399999976158142,\s*0\.7625,\s*0\);[\s\S]*const ULTRA_HARD_SPHERE_CYLINDER_RADIUS = 0\.48500001430511475;[\s\S]*const ULTRA_HARD_SPHERE_CYLINDER_HALF_HEIGHT = 0\.6325;/,
  'Ultra cylinder particles should use the measured glass_bottle_inner_air GLB center, radius, and scaled half-height',
);
assert.match(
  hardSphereLayerSource,
  /const ULTRA_HARD_SPHERE_PARTICLE_RADIUS = PARTICLE_RADIUS \* 0\.75;[\s\S]*particleRadius: ULTRA_HARD_SPHERE_PARTICLE_RADIUS[\s\S]*particleCountScale: 0\.75[\s\S]*pumpEntryRateScale: 0\.5/,
  'Ultra cylinder particles should render and collide at three quarters of the current radius and count, with half-rate pump entry',
);
assert.match(
  hardSphereLayerSource,
  /stopcockFlowOpen,[\s\S]*pumpFlowActive,[\s\S]*pumpFlowIntensity,[\s\S]*releaseFlowActive,/,
  'Hard-sphere visual inputs should use the current full pump and release flow path directly',
);
assert.match(
  hardSphereLayerSource,
  /pumpFlowActive: pumpPortActive[\s\S]*releasePhase: currentReleaseTimeline\.phase/,
  'Hard-sphere simulation steps should keep pump entry and release phase connected without the retired motion gate',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /motionMode|pump-only|staticMotionOnly|pumpMotionEnabled|releaseMotionEnabled/,
  'Hard-sphere layer should not retain retired breakpoint-only motion gates',
);

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
  /const ULTRA_DISPLAY_PIXEL_SIZE = 8;[\s\S]*const ULTRA_DISPLAY_PIXEL_GAP = 2;[\s\S]*const ULTRA_DISPLAY_DIGIT_ADVANCE = 54;[\s\S]*const ULTRA_DISPLAY_UNIT_ADVANCE = 51;[\s\S]*const ULTRA_DISPLAY_UNIT_GAP = 19;/,
  'Ultra digital display should use a fixed pixel grid scaled down to about four fifths of the previous oversized readout',
);
assert.match(
  ultraModelSource,
  /const ULTRA_DISPLAY_DECIMAL_COLUMNS = 2;[\s\S]*const ULTRA_DISPLAY_DECIMAL_ROWS = 3;[\s\S]*const ULTRA_DISPLAY_DECIMAL_WIDTH = ULTRA_DISPLAY_DECIMAL_COLUMNS \* ULTRA_DISPLAY_PIXEL_SIZE \+ \(ULTRA_DISPLAY_DECIMAL_COLUMNS - 1\) \* ULTRA_DISPLAY_PIXEL_GAP;/,
  'Ultra digital display decimal points should use a dedicated visible two-by-three pixel block',
);
[
  /const ULTRA_DISPLAY_GLYPHS[\s\S]*'0': \[/,
  /const ULTRA_DISPLAY_GLYPHS[\s\S]*'1': \[/,
  /const ULTRA_DISPLAY_GLYPHS[\s\S]*'\+': \[/,
  /const ULTRA_DISPLAY_GLYPHS[\s\S]*'-': \[/,
  /const ULTRA_DISPLAY_GLYPHS[\s\S]*m: \[/,
  /const ULTRA_DISPLAY_GLYPHS[\s\S]*V: \[/,
].forEach((glyphPattern) => {
  assert.match(
    ultraModelSource,
    glyphPattern,
    'Ultra digital display should render numbers and mV units through pixel-dot glyph patterns',
  );
});
assert.match(
  ultraModelSource,
  /const drawUltraAlignedSignal = \([\s\S]*const leftFieldWidth = ULTRA_DISPLAY_SIGN_AND_INTEGER_SLOTS \* ULTRA_DISPLAY_DIGIT_ADVANCE[\s\S]*const decimalFieldWidth = ULTRA_DISPLAY_DECIMAL_WIDTH[\s\S]*const decimalX = Math\.round\(startX \+ leftFieldWidth \+ ULTRA_DISPLAY_DECIMAL_GAP\)[\s\S]*const unitStartX = fractionStartX \+ fractionFieldWidth \+ ULTRA_DISPLAY_UNIT_GAP[\s\S]*drawUltraDisplayDecimalPoint\(context, decimalX,[\s\S]*drawUltraDisplayGlyph\(context, 'm', unitStartX,[\s\S]*drawUltraDisplayGlyph\(context, 'V', unitStartX \+ ULTRA_DISPLAY_UNIT_ADVANCE/,
  'Ultra digital display should center the fixed pixel field while keeping decimal points and mV units column-aligned across rows',
);
assert.doesNotMatch(
  ultraModelSource.match(/const drawUltraAlignedSignal = \([\s\S]*?\n\};/)?.[0] ?? '',
  /measureText|fillText|textAlign/,
  'Ultra digital display should no longer rely on browser text metrics that make the readout narrow or font-dependent',
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
  /texture\.magFilter = THREE\.NearestFilter;/,
  'Ultra dynamic display texture should keep the enlarged pixel-dot readout crisp instead of smoothing it into a narrow font-like blur',
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
  /const resolveUltraActionControl = useCallback\([\s\S]*const panelResolvedControl = resolveUltraPanelPointerControl\(control, clientX, clientY\)[\s\S]*panelResolvedControl === 'pumpValve' && props\.hoveredControl === 'stopcock'[\s\S]*const handleUltraControlClick = useCallback\([\s\S]*const clientX = event\.clientX;[\s\S]*const clientY = event\.clientY;[\s\S]*const runControlClick = \(\) => \{[\s\S]*const resolvedControl = resolveUltraActionControl\(control, clientX, clientY\)/,
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
assert.match(
  ultraModelSource,
  /const handleUltraControlWheel = useCallback\([\s\S]*const resolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\)[\s\S]*if \(resolvedControl !== 'pressureZero'\) return;[\s\S]*absorbUltraPointerEvent\(event\);[\s\S]*if \(!props\.pressureZeroInteractionEnabled\) \{[\s\S]*return;[\s\S]*\}[\s\S]*const requestedDelta = \(event\.deltaY < 0 \? PRESSURE_ZERO_FINE_ANGLE_STEP_DEG : -PRESSURE_ZERO_FINE_ANGLE_STEP_DEG\)\s*\*\s*PRESSURE_ZERO_DRAG_DIRECTION;[\s\S]*props\.onPressureZeroFineAdjust\(boundedDelta\);/,
  'Ultra GLB pressure-zero wheel fine adjustment should reuse the same hitbox disambiguation and fine-step scaling as the skeleton model',
);
assert.match(
  ultraModelSource,
  /onWheel\?: \(control: UltraPointerControl, event: ThreeEvent<WheelEvent>\) => void;[\s\S]*onWheel=\{\(event\) => onWheel\?\.\(definition\.control, event\)\}/,
  'Ultra GLB hitboxes should forward wheel events so the pressure-zero knob can handle fine adjustment',
);
assert.match(
  ultraModelSource,
  /<UltraNodeHitbox[\s\S]*onWheel=\{handleUltraControlWheel\}/,
  'Ultra GLB control hitboxes should route wheel events through the shared pressure-zero fine-adjust handler',
);
assert.match(
  ultraModelSource,
  /const baseShellColor = powerOn \? themeVisuals\.powerSwitchOn : themeVisuals\.powerSwitchOff;[\s\S]*const emphasized = hovered \|\| focused;[\s\S]*const shellColor = emphasized[\s\S]*getUltraNaturalHighlightColor\(new THREE\.Color\(baseShellColor\), 0\.28, 0\.075\)[\s\S]*HSL_PowerSwitch_SkirtedRockerShell[\s\S]*roughness=\{0\.18\}[\s\S]*emissiveIntensity=\{hovered \? 0\.34 : focused \? 0\.22 : powerOn \? 0\.08 : 0\.035\}/,
  'Ultra power switch shell should keep its base red/green hue, preserve its markings, and brighten clearly on hover or guide focus',
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
  /useEffect\(\(\) => \{\s*invalidate\(\);\s*\}, \[gaugeNeedleTargetRotation, invalidate\]\);/,
  'Ultra gauge target changes should trigger a single render and let the gauge useFrame continue only while the needle is moving',
);
const ultraControlMotionInvalidationStart = ultraModelSource.indexOf('const keepControlMotionRendering = (timestamp: number) => {');
assert.notEqual(ultraControlMotionInvalidationStart, -1, 'Ultra timed control invalidation loop should exist');
const ultraControlMotionInvalidationEnd = ultraModelSource.indexOf('  useFrame((_, delta) => {', ultraControlMotionInvalidationStart);
assert.notEqual(ultraControlMotionInvalidationEnd, -1, 'Ultra timed control invalidation loop should end before the runtime useFrame');
assert.doesNotMatch(
  ultraModelSource.slice(ultraControlMotionInvalidationStart, ultraControlMotionInvalidationEnd),
  /gaugeNeedleTargetRotation/,
  'Ultra timed control invalidation loop should not restart for every live gauge target change after power-on',
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
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*position: \[3\.756,\s*4\.473,\s*5\.719\][\s\S]*target: \[0\.31,\s*0\.436,\s*-0\.092\][\s\S]*fov: 36[\s\S]*responsiveFov:[\s\S]*aspect: 1\.35[\s\S]*narrowAspect: 0\.95[\s\S]*fov: 52[\s\S]*wideAspect: 3[\s\S]*wideFov: 56/,
  'Ultra default view should use the captured GLB position and target while widening FOV from the base value for resized canvases',
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
  /HSL_Stopcock_OpenPath_Glow'[\s\S]*HSL_Stopcock_ClosedBlocker_Mark'[\s\S]*const ultraStopcockConnected = stopcockOpen[\s\S]*openPathGlow\.visible = ultraStopcockConnected[\s\S]*closedBlockerMark\.visible = !ultraStopcockConnected/,
  'Ultra stopcock connected/check and disconnected/cross markers should match the shared logical stopcock state used by pump and release physics',
);
assert.match(
  ultraModelSource,
  /function UltraPumpValveEmbeddedSwitch[\s\S]*anchorNodeName\s*=\s*['"]HSL_BallValve_Body['"][\s\S]*position=\{ULTRA_PUMP_VALVE_EMBEDDED_SWITCH_OFFSET\}[\s\S]*pumpValveOpen \? ULTRA_VALVE_STATE_LAMP_OPEN_COLOR : ULTRA_VALVE_STATE_LAMP_CLOSED_COLOR/,
  'Ultra pump valve should add a red/green embedded switch anchored on the fixed black valve body so the default camera can read open versus closed',
);
assert.match(
  ultraModelSource,
  /<UltraPumpValveEmbeddedSwitch[\s\S]*nodeMap=\{nodeMap\}[\s\S]*parentRef=\{runtimeRootRef\}[\s\S]*pumpValveOpen=\{props\.pumpValveOpen\}/,
  'Ultra pump valve embedded switch should follow the same pumpValveOpen state used by the valve animation and physics controls',
);
assert.match(
  ultraModelSource,
  /const ULTRA_PUMP_VALVE_EMBEDDED_SWITCH_OFFSET: \[number, number, number\] = \[0\.09,\s*0\.02,\s*0\];/,
  'Ultra pump valve embedded switch should intersect the fixed black valve body side facing the host instrument instead of sitting on the rotating red handle',
);
assert.match(
  ultraModelSource,
  /const ULTRA_PUMP_VALVE_EMBEDDED_SWITCH_ROTATION: \[number, number, number\] = \[0,\s*0,\s*-Math\.PI \/ 2\];[\s\S]*rotation=\{ULTRA_PUMP_VALVE_EMBEDDED_SWITCH_ROTATION\}/,
  'Ultra pump valve embedded switch should rotate its round face onto the host-facing side wall of the fixed valve body',
);
assert.match(
  ultraModelSource,
  /HSL_UltraPumpValveEmbeddedSwitchRecess[\s\S]*<meshStandardMaterial[\s\S]*roughness=\{0\.46\}[\s\S]*metalness=\{0\.42\}[\s\S]*HSL_UltraPumpValveEmbeddedSwitchLens[\s\S]*<meshStandardMaterial[\s\S]*emissive=\{pumpValveOpen \? ULTRA_VALVE_STATE_LAMP_OPEN_COLOR : ULTRA_VALVE_STATE_LAMP_CLOSED_COLOR\}[\s\S]*emissiveIntensity=\{pumpValveOpen \? 1\.45 : 1\.25\}[\s\S]*HSL_UltraPumpValveEmbeddedSwitchLensHighlight/,
  'Ultra pump valve embedded switch should read as an inset physical switch with a dark recessed socket, emissive colored lens, and lens highlight',
);
assert.match(
  ultraModelSource,
  /HSL_UltraPumpValveEmbeddedSwitchRecess[\s\S]*<cylinderGeometry args=\{\[0\.0395,\s*0\.0395,\s*0\.018,\s*32\]\}[\s\S]*HSL_UltraPumpValveEmbeddedSwitchLens[\s\S]*<cylinderGeometry args=\{\[0\.0255,\s*0\.0235,\s*0\.01,\s*36\]\}/,
  'Ultra pump valve embedded switch should keep the inset indicator compact at about half the previous visible diameter',
);
assert.doesNotMatch(
  ultraModelSource.match(/function UltraPumpValveEmbeddedSwitch[\s\S]*?function UltraNodeHalo/)?.[0] ?? '',
  /depthTest=\{false\}/,
  'Ultra pump valve embedded switch should respect depth testing so the fixed black valve body occludes it from the opposite side',
);
assert.match(
  ultraModelSource,
  /function UltraPumpValveEmbeddedSwitch[\s\S]*useThree\(\(\{ camera \}\) => camera\)[\s\S]*switchGroup\.getWorldPosition[\s\S]*set\(0,\s*1,\s*0\)[\s\S]*switchGroup\.visible = valveFaceNormalRef\.current\.dot\(cameraDirectionRef\.current\) > 0\.08/,
  'Ultra pump valve embedded switch should only be visible from the host-facing side surface and disappear when viewed from behind that surface',
);
assert.doesNotMatch(
  ultraModelSource.match(/function UltraPumpValveEmbeddedSwitch[\s\S]*?\n\}/)?.[0] ?? '',
  /InletValue_Pivot|InletValue_HandleStem|InletValue_THandle/,
  'Ultra pump valve embedded switch must not be anchored to the rotating red handle nodes',
);

[
  'NATIVE_CONTROL_SINGLE_CLICK_DELAY_MS',
  'PUMP_VALVE_OVERLAP_PRIORITY_DISTANCE_EPSILON',
  'gl.domElement.addEventListener',
].forEach((forbiddenToken) => {
  assert.doesNotMatch(
    ultraModelSource,
    new RegExp(forbiddenToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Ultra GLB display adapter should not keep obsolete interaction token ${forbiddenToken}`,
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
  /const ULTRA_INSTRUMENT_FOCUS_HITBOX = \{[\s\S]*anchorNodeName: 'FD_NCD_C_FrontPanel'[\s\S]*size: \[2\.04,\s*0\.86,\s*0\.36\][\s\S]*function UltraInstrumentFocusHitbox[\s\S]*name="HSL_UltraMeshHitbox_instrumentFocus"[\s\S]*onDoubleClick=\{onDoubleClick\}/,
  'Ultra GLB should expose a large front-panel double-click hitbox so the whole host can enter instrument focus',
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
  /control: 'pumpBulb', anchorNodeName: 'Pump_Bulb', size: \[0\.64, 0\.50, 0\.52\]/,
  'Ultra pump-bulb hitbox should stay close to the visible bulb instead of reaching far outside the rubber body',
);
const ultraPumpBulbVisualTargetSection = ultraModelSource.match(/id: 'pumpBulb'[\s\S]*?focusShellPulseRetreatScale: 1\.055,/)?.[0] ?? '';
assert.doesNotMatch(
  ultraPumpBulbVisualTargetSection,
  /hoverWireframe:\s*true/,
  'Ultra pump-bulb hover should not show a latitude-longitude wireframe sphere over the refined GLB model',
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
  /const resolveUltraActionControl = useCallback\([\s\S]*panelResolvedControl === 'pumpValve' && props\.hoveredControl === 'stopcock'[\s\S]*const handleUltraControlClick = useCallback\([\s\S]*const runControlClick = \(\) => \{[\s\S]*const resolvedControl = resolveUltraActionControl\(control, clientX, clientY\)[\s\S]*if \(resolvedControl === 'powerSwitch'\)[\s\S]*else if \(resolvedControl === 'stopcock'\)[\s\S]*else if \(resolvedControl === 'pumpValve'\)/,
  'Ultra GLB valve clicks should honor the current hover target so pump-valve depth does not steal stopcock-handle clicks',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*demoFocusControlId=\{props\.demoFocusControlId\}[\s\S]*demoFocusPulseActive=\{props\.demoFocusPulseActive\}[\s\S]*interactionQualityReduced=\{interactionQualityReduced\}[\s\S]*visualEffects=\{\{[\s\S]*demoHaloColor: scenePalette\.effects\.demoHalo[\s\S]*nonBulbHoverHaloOpacity: scenePalette\.effects\.nonBulbHoverHaloOpacity[\s\S]*pumpBulbHoverHaloOpacity: scenePalette\.effects\.pumpBulbHoverHaloOpacity/,
  'Heat Capacity scene should pass the procedural demo/guide pulse palette into the Ultra GLB visual layer',
);
assert.match(
  sceneSource,
  /dark:\s*\{[\s\S]*focusShellColor:\s*'#72f5d1'[\s\S]*focusShellRimColor:\s*'#8cf7df'[\s\S]*focusShellBlendMode:\s*'additive'[\s\S]*light:\s*\{[\s\S]*focusShellColor:\s*'#0f8fa3'[\s\S]*focusShellRimColor:\s*'#34c8b7'[\s\S]*focusShellBlendMode:\s*'normal'/,
  'Ultra focus shells should use separate dark and light theme colors and blend modes instead of one blue sticker-like pulse',
);
assert.match(
  sceneSource,
  /focusShellColor: scenePalette\.effects\.focusShellColor[\s\S]*focusShellRimColor: scenePalette\.effects\.focusShellRimColor[\s\S]*focusShellBlendMode: scenePalette\.effects\.focusShellBlendMode[\s\S]*focusShellPulseRate: scenePalette\.effects\.focusShellPulseRate/,
  'Heat Capacity scene should pass the theme-specific focus shell pulse values into the Ultra GLB visual layer',
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
  /focusShellNodeNames: \['FD_NCD_C_PowerSwitch_Base', 'HSL_PowerSwitch_Inset_Frame_Lip'\][\s\S]*focusShellNodeNames: \['FD_NCD_C_ZeroAdjustKnob'\][\s\S]*focusShellNodeNames: \['Stopcock_THandle', 'Stopcock_HandleStem', 'Stopcock_RotatingPlugCore'\][\s\S]*focusShellNodeNames: \['InletValue_Pivot'\][\s\S]*focusShellNodeNames: \['Pump_Bulb'\]/,
  'Ultra guide/demo focus should pulse real GLB shell nodes instead of generic torus or box overlays',
);
assert.match(
  ultraModelSource,
  /id: 'powerSwitch'[\s\S]*focusShellPulsePopScale: 1\.42[\s\S]*focusShellPulseRetreatScale: 1\.18[\s\S]*id: 'pressureZero'[\s\S]*focusShellPulsePopScale: 1\.34[\s\S]*focusShellPulseRetreatScale: 1\.14[\s\S]*id: 'pumpValve'[\s\S]*focusShellPulsePopScale: 1\.28[\s\S]*focusShellPulseRetreatScale: 1\.11/,
  'Small Ultra focus targets should use target-specific pop and retreat scales so range expansion is visible when opacity peaks',
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
  /type UltraFocusShellMeshEntry[\s\S]*collectUltraFocusShellMeshes[\s\S]*anchorInverseMatrix[\s\S]*mesh\.matrixWorld[\s\S]*HSL_UltraFocusShellBreath_[\s\S]*HSL_UltraFocusShellPulse_/,
  'Ultra guide/demo focus should build a two-layer shell pulse from the focused GLB node geometry',
);
assert.match(
  ultraModelSource,
  /const shellSide = target\.focusShellSide === 'double' \? THREE\.DoubleSide : THREE\.BackSide;[\s\S]*const focusShellDepthTest = target\.focusShellSide !== 'double';[\s\S]*depthTest: focusShellDepthTest[\s\S]*polygonOffsetFactor: -4[\s\S]*depthTest: focusShellDepthTest[\s\S]*polygonOffsetFactor: -8[\s\S]*renderOrder=\{24\}[\s\S]*renderOrder=\{25\}/,
  'Ultra focus shells should use occluded back-side outer shells for 3D controls while keeping flat display overlays visible',
);
assert.match(
  ultraModelSource,
  /const initializeUltraFocusShellMeshMorphTargets = \(mesh: THREE\.Mesh\) => \{[\s\S]*mesh\.updateMorphTargets\(\);[\s\S]*onUpdate=\{initializeUltraFocusShellMeshMorphTargets\}[\s\S]*onUpdate=\{initializeUltraFocusShellMeshMorphTargets\}/,
  'Ultra focus shell meshes should initialize morphTargetInfluences for GLB morph geometries before Three renders them',
);
assert.match(
  ultraModelSource,
  /const popProgress = Math\.min\(pulse \/ ULTRA_FOCUS_SHELL_POP_FRACTION, 1\);[\s\S]*const fadeProgress = Math\.max\(\(pulse - ULTRA_FOCUS_SHELL_POP_FRACTION\) \/ \(1 - ULTRA_FOCUS_SHELL_POP_FRACTION\), 0\);[\s\S]*const pulsePeakScale = target\.focusShellPulsePopScale \?\? effects\.focusShellPulseStartScale;[\s\S]*pulseGroup\.scale\.setScalar\(THREE\.MathUtils\.lerp\(effects\.focusShellPulseStartScale, pulsePeakScale, popEase\) - fadeEase \* pulseRetreatDistance\);[\s\S]*shellPulseMaterial\.opacity = effects\.focusShellPulseOpacity \* popEase \* Math\.pow\(1 - fadeProgress,\s*1\.45\)/,
  'Ultra focus shell pulse should pop range and opacity together, then fade while only slightly retreating',
);
assert.match(
  ultraModelSource,
  /const focusPulseStartedAtRef = useRef<number \| null>\(null\);[\s\S]*if \(focusPulseStartedAtRef\.current === null\) focusPulseStartedAtRef\.current = clock\.elapsedTime;[\s\S]*const focusPulseElapsed = Math\.max\(0, clock\.elapsedTime - focusPulseStartedAtRef\.current\);[\s\S]*const pulse = \(focusPulseElapsed \* effects\.focusShellPulseRate\) % 1;/,
  'Ultra focus shell pulse should start its pop phase when the guide/demo focus appears instead of using a random global clock phase',
);
assert.match(
  ultraModelSource,
  /function UltraPowerSwitchSkirtedRocker[\s\S]*focusPulseRef = useRef<THREE\.Mesh \| null>\(null\);[\s\S]*focusPulseMaterial = useMemo\(\(\) => new THREE\.MeshBasicMaterial\(\{[\s\S]*depthTest: true[\s\S]*side: THREE\.BackSide[\s\S]*focusPulse\.scale\.set\(pulseScale, pulseScale, pulseDepthScale\);[\s\S]*focusPulseMaterial\.opacity = 0\.32 \* popEase \* Math\.pow\(1 - fadeProgress,\s*1\.45\);[\s\S]*name="HSL_PowerSwitch_SkirtedRockerFocusPulse"[\s\S]*scale=\{\[1\.42, 1\.42, 1\.18\]\}/,
  'Ultra runtime power switch rocker should get the same synchronized pop-and-fade pulse as GLB shell nodes',
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
  /hoverMesh\.scale\.setScalar\(focusMode \? 1 : target\.hoverScale \?\? 1\)/,
  'Ultra hover hints should still use per-target shrink factors when they fall back to the hover geometry path',
);
assert.match(
  ultraModelSource,
  /wireframe=\{mode === 'hover' && target\.hoverWireframe === true\}/,
  'Ultra hover hint materials should support outline rendering so the blue cue does not mask the GLB control surface',
);
assert.match(
  ultraModelSource,
  /<UltraPowerSwitchSkirtedRocker[\s\S]*hovered=\{props\.hoveredControl === 'powerSwitch'\}[\s\S]*focused=\{props\.demoFocusPulseActive && props\.demoFocusControlId === 'powerSwitch'\}/,
  'Ultra power switch runtime rocker should brighten during guide/demo focus, not only on mouse hover',
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

assert.match(
  sceneSource,
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*stopcock:[\s\S]*position: \[-0\.45,\s*2\.58,\s*4\.85\][\s\S]*target: \[-1\.2,\s*1\.06,\s*0\.44\][\s\S]*fov: 50[\s\S]*instrument:[\s\S]*position: \[2\.78,\s*1\.16,\s*3\.85\][\s\S]*target: \[2\.24,\s*0\.06,\s*0\.28\][\s\S]*fov: 32[\s\S]*pump:[\s\S]*position: \[2\.34,\s*1\.24,\s*3\.55\][\s\S]*target: \[0\.98,\s*0\.34,\s*0\.28\][\s\S]*fov: 36/,
  'Ultra mode should define model-specific focus views for stopcock, instrument, and pump instead of falling back to the GLB default view',
);
assert.match(
  sceneSource,
  /if \(focusMode !== 'none'\) return;[\s\S]*getCameraFovForAspect\(cameraViewScheme, aspect\)[\s\S]*const startFov = camera\.fov[\s\S]*const nextFov = focusView[\s\S]*\? focusView\.fov \?\? cameraViewScheme\.fov[\s\S]*: getCameraFovForAspect\(cameraViewScheme, aspect\)[\s\S]*camera\.fov = THREE\.MathUtils\.lerp\(startFov, nextFov, eased\)/,
  'Ultra focus views should animate back to the base model FOV so short-wide canvases do not shrink focused controls',
);
assert.doesNotMatch(
  sceneSource,
  /props\.performanceMode === 'ultra' && focusMode !== 'none'/,
  'Ultra mode should no longer force focused views back to the default camera',
);
assert.match(
  sceneSource,
  /const orbitControlsEnabled = focusMode === 'none' && !props\.interactionLocked;/,
  'Ultra focus mode should use the same orbit-lock policy as the procedural model so the smooth focused view stays stable',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*pressureZeroInteractionEnabled=\{focusMode === 'instrument'\}[\s\S]*pumpBulbInteractionEnabled=\{focusMode === 'pump'\}[\s\S]*onFocus=\{setFocusMode\}/,
  'Heat Capacity scene should pass the focused-mode zero-knob gate and focus entry callback into the Ultra GLB hitbox layer',
);
assert.match(
  ultraModelSource,
  /pressureZeroInteractionEnabled: boolean;[\s\S]*pumpBulbInteractionEnabled: boolean;[\s\S]*onFocus: \(mode: UltraFocusMode\) => void;/,
  'Ultra GLB props should expose the same focused-mode pressure-zero interaction gate used by the procedural skeleton',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlPointerDown = useCallback\([\s\S]*if \(!props\.pressureZeroInteractionEnabled\) \{[\s\S]*return;[\s\S]*\}/,
  'Ultra pressure-zero dragging should be blocked outside instrument focus instead of adjusting the zero value from the default view',
);
assert.match(
  ultraModelSource,
  /else if \(resolvedControl === 'pumpBulb'\) \{[\s\S]*if \(!props\.pumpBulbInteractionEnabled\) return;[\s\S]*props\.onPumpBulbPress\(\);/,
  'Ultra pump bulb clicks should be ignored outside pump focus so the default view cannot trigger pump animation or pressure changes',
);
assert.match(
  ultraModelSource,
  /gl\.domElement\.style\.cursor = resolvedControl === 'pressureZero' && props\.pressureZeroInteractionEnabled \? 'grab' : 'pointer';/,
  'Ultra pressure-zero hover should only show a drag cursor while instrument focus allows actual adjustment',
);
assert.match(
  ultraModelSource,
  /onDoubleClick\?: \(control: UltraPointerControl, event: ThreeEvent<MouseEvent>\) => void;[\s\S]*onDoubleClick=\{\(event\) => onDoubleClick\?\.\(definition\.control, event\)\}/,
  'Ultra GLB hitboxes should forward double-clicks so GLB controls can enter the same focus modes as the procedural skeleton',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlDoubleClick = useCallback\([\s\S]*if \(resolvedControl === 'powerSwitch' \|\| resolvedControl === 'pressureZero'\) \{[\s\S]*props\.onFocus\('instrument'\);[\s\S]*\} else if \(resolvedControl === 'pumpBulb'\) \{[\s\S]*props\.onFocus\('pump'\);[\s\S]*\} else \{[\s\S]*props\.onFocus\('stopcock'\);/,
  'Ultra GLB double-click focus entry should map instrument controls, pump bulb, and valves to their matching focus modes',
);
assert.match(
  ultraModelSource,
  /const ULTRA_DOUBLE_CLICK_GUARD_MS = 220;[\s\S]*const pendingUltraSingleClickRef = useRef<number \| null>\(null\);[\s\S]*const clearPendingUltraSingleClick = useCallback\(\(\) => \{[\s\S]*window\.clearTimeout\(pendingUltraSingleClickRef\.current\)[\s\S]*const scheduleUltraSingleClick = useCallback\(\(run: \(\) => void\) => \{[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*run\(\);[\s\S]*ULTRA_DOUBLE_CLICK_GUARD_MS/,
  'Ultra GLB non-focused clicks should still defer single-click side effects briefly so a fast second click can become focus instead',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlClick = useCallback\([\s\S]*const runControlClick = \(\) => \{[\s\S]*props\.onPowerToggle\(\)[\s\S]*props\.onPumpValveToggle\(\)[\s\S]*props\.onPumpBulbPress\(\);[\s\S]*if \(props\.focusMode !== 'none'\) \{[\s\S]*runControlClick\(\);[\s\S]*return;[\s\S]*\}[\s\S]*scheduleUltraSingleClick\(runControlClick\);[\s\S]*const handleUltraControlDoubleClick = useCallback\([\s\S]*clearPendingUltraSingleClick\(\);[\s\S]*props\.onFocus\('instrument'\);[\s\S]*props\.onFocus\('pump'\);[\s\S]*props\.onFocus\('stopcock'\);/,
  'Ultra GLB should keep double-click protection before focus but run focused control clicks immediately from the latest control state',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*focusMode=\{focusMode\}/,
  'Heat Capacity scene should pass focus mode into the Ultra GLB layer so focused clicks do not wait behind double-click protection',
);
assert.match(
  ultraModelSource,
  /const handleUltraInstrumentFocusDoubleClick = useCallback\([\s\S]*props\.onFocus\('instrument'\);[\s\S]*<UltraInstrumentFocusHitbox[\s\S]*onDoubleClick=\{handleUltraInstrumentFocusDoubleClick\}/,
  'Ultra GLB host body double-clicks should enter instrument focus without requiring the user to hit the small switch or knob',
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
  'Mode buttons should not stay globally disabled just because Ultra GLB mode is active',
);

console.log('heatCapacityUltraGlbIntegration tests passed');
