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
const readGlbJsonChunk = (binary: Buffer) => {
  assert.equal(binary.toString('utf8', 0, 4), 'glTF', 'runtime GLB should use the binary glTF container format');
  let offset = 12;
  while (offset < binary.length) {
    const chunkLength = binary.readUInt32LE(offset);
    const chunkType = binary.toString('utf8', offset + 4, offset + 8);
    if (chunkType === 'JSON') {
      return JSON.parse(binary.toString('utf8', offset + 8, offset + 8 + chunkLength)) as {
        nodes?: Array<{
          name?: string;
          rotation?: number[];
        }>;
      };
    }
    offset += 8 + chunkLength;
  }
  throw new Error('runtime GLB should include a JSON chunk');
};
const runtimeGlbJson = readGlbJsonChunk(runtimeGlbBinary);

assert.match(
  sceneSource,
  /import HeatCapacityUltraInstrumentModel, \{[\s\S]*clearHeatCapacityUltraInstrumentModelCache,[\s\S]*type HeatCapacityUltraVisualState,[\s\S]*\} from '\.\/HeatCapacityUltraInstrumentModel';/,
  'Heat Capacity scene should import the Ultra GLB adapter',
);
assert.match(
  sceneSource,
  /const proceduralSceneContent = \([\s\S]*<InstrumentSceneContent[\s\S]*const proceduralSceneWithReadyGate = \([\s\S]*const instrumentSceneContent = qualityProfile\.renderModel === 'ultraGlb'[\s\S]*<HeatCapacityUltraInstrumentModel[\s\S]*: proceduralSceneWithReadyGate/,
  'Heat Capacity scene should render the Ultra GLB adapter for GLB quality profiles and keep the procedural fallback for other modes',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraModelErrorBoundary key=\{ultraLoadAttempt\} onError=\{handleUltraModelError\}>[\s\S]*<Suspense fallback=\{null\}>/,
  'Ultra GLB should keep normal Suspense loading visually empty and remount its guarded loader on retry',
);
assert.doesNotMatch(
  sceneSource,
  /<HeatCapacityUltraModelErrorBoundary[^>]*fallback=\{proceduralSceneWithReadyGate\}/,
  'Ultra GLB failures must never reveal the procedural skeleton',
);
assert.match(
  sceneSource,
  /data-heat-capacity-ultra-load-error="true"[\s\S]*data-heat-capacity-ultra-load-retry="true"[\s\S]*onClick=\{retryUltraModelLoad\}/,
  'Ultra GLB failures should expose an explicit retryable error layer',
);
assert.match(
  ultraModelSource,
  /export const clearHeatCapacityUltraInstrumentModelCache = \(\) => \{[\s\S]*useGLTF\.clear\(ULTRA_GLB_PATH\);/,
  'Ultra GLB retry should clear the rejected loader cache before remounting',
);
assert.doesNotMatch(
  sceneSource,
  /<Suspense fallback=\{proceduralScene(?:Content|WithReadyGate)\}>/,
  'Ultra GLB loading must not flash the procedural skeleton before the real model mounts',
);
assert.match(
  sceneSource,
  /export type HeatCapacityCameraPose = \{[\s\S]*position: \[number, number, number\];[\s\S]*target: \[number, number, number\];[\s\S]*fov: number;/,
  'Heat Capacity scene should export a serializable arbitrary camera pose contract',
);
assert.match(
  sceneSource,
  /initialCameraPose\?: HeatCapacityCameraPose \| null;[\s\S]*onCameraPoseChange\?: \(sceneFileId: string, pose: HeatCapacityCameraPose\) => void;[\s\S]*restoredSceneFrameDataUrl\?: string \| null;[\s\S]*onSceneFrameCapture\?: \([\s\S]*sceneFileId: string,[\s\S]*dataUrl: string,[\s\S]*cameraPose: HeatCapacityCameraPose,[\s\S]*metadata: HeatCapacitySceneFrameCaptureMetadata,[\s\S]*\) => void;[\s\S]*onSceneReady\?: \(\) => void;/,
  'Heat Capacity scene should expose camera, last-good-frame, and readiness restore hooks',
);
assert.match(
  sceneSource,
  /useLayoutEffect\(\(\) => \{[\s\S]*camera\.position\.set\(\.\.\.initialCameraPose\.position\);[\s\S]*controlsRef\.current\.target\.set\(\.\.\.initialCameraPose\.target\);/,
  'CameraRig should apply the restored position and OrbitControls target before the first visible frame',
);
assert.match(
  sceneSource,
  /HEAT_CAPACITY_SCENE_FRAME_CAPTURE_SETTLE_DELAY_MS[\s\S]*function HeatCapacitySceneFrameCaptureBridge[\s\S]*sceneDirtyRef\.current[\s\S]*gl\.domElement\.toDataURL\('image\/webp'/,
  'Heat Capacity scene should debounce settled last-good-frame captures and track animation dirtiness without periodic encoding',
);
assert.doesNotMatch(
  sceneSource,
  /useFrame\(\(\) => \{\s*if \(active\) captureSceneFrame/,
  'active Heat Capacity animation frames must not synchronously encode a restore image on a fixed cadence',
);
assert.match(
  workbenchSource,
  /const persistLifecycleCheckpoint = \(\) => \{[\s\S]*sceneCaptureRegistration\?\.fileId === activeSceneFile\.id[\s\S]*sceneCaptureCompleted = sceneCaptureProvider\(\) !== null;[\s\S]*persistWorkbenchSession\(encodeWorkbenchSession[\s\S]*heatCapacityRefreshPersistRef\.current\(\);[\s\S]*window\.addEventListener\('pagehide', persistBeforePageHide\)[\s\S]*document\.addEventListener\('visibilitychange', persistWhenHidden\)/,
  'Workbench should own the final scene → main-session → refresh-checkpoint lifecycle flush for hidden tabs and page hide',
);
assert.match(
  workbenchSource,
  /const persistLifecycleCheckpointOnce = \(\) => \{[\s\S]*HEAT_CAPACITY_LIFECYCLE_DUPLICATE_FLUSH_WINDOW_MS[\s\S]*if \(persistLifecycleCheckpoint\(\)\)[\s\S]*const persistBeforePageHide = \(\) => persistLifecycleCheckpointOnce\(\);[\s\S]*document\.visibilityState === 'hidden'[\s\S]*persistLifecycleCheckpointOnce\(\);/,
  'pagehide and visibility-hidden should share an order-independent, short-window lifecycle flush guard',
);
assert.match(
  workbenchSource,
  /const handleHeatCapacitySceneFrameCapture = \([\s\S]*sceneFileId: string,[\s\S]*if \(sceneFileId !== activeFileIdRef\.current\) return;[\s\S]*currentFile\.id !== sceneFileId/,
  'stale captures from an unmounting Heat Capacity file must never be stored under the newly active file',
);
assert.match(
  workbenchSource,
  /if \(heatCapacitySceneCaptureProviderRef\.current\?\.fileId === sceneFileId\) \{\s*heatCapacitySceneCaptureProviderRef\.current = null;/,
  'an old keyed scene may clear only its own lifecycle capture provider registration',
);
assert.match(
  sceneSource,
  /gl: \{ preserveDrawingBuffer: sceneFrameCaptureEnabled \}/,
  'Canvas should preserve its drawing buffer only when refresh-frame capture is connected',
);
assert.match(
  sceneSource,
  /props\.restoredSceneFrameDataUrl && !sceneRevealReady[\s\S]*data-heat-capacity-restored-scene-frame="true"/,
  'A restored Canvas frame should remain above WebGL until the parent restore acknowledgement and reveal frame complete',
);
assert.match(
  sceneSource,
  /sceneRestoreAcknowledged\?: boolean;[\s\S]*const parentRestoreAcknowledged = props\.sceneRestoreAcknowledged \?\? true;[\s\S]*<HeatCapacitySceneRevealBridge[\s\S]*requested=\{sceneRevealRequested\}/,
  'The restored frame reveal must be gated by an explicit parent acknowledgement and a rendered-frame handshake',
);
assert.match(
  sceneSource,
  /const handleSceneRevealReady = useCallback\(\(\) => \{\s*setSceneRevealReady\(true\);\s*props\.onSceneRestoreRevealComplete\?\.\(props\.sceneFileId\);/,
  'the scene should tell its parent when the one-time restored-frame reveal handshake completes',
);
assert.match(
  workbenchSource,
  /const handleHeatCapacitySceneRestoreRevealComplete = useCallback\(\(sceneFileId: string\) => \{[\s\S]*setHeatCapacityInitialSceneRestoreEnabled\(false\);[\s\S]*onSceneRestoreRevealComplete=\{handleHeatCapacitySceneRestoreRevealComplete\}/,
  'Workbench should permanently consume the initial restore frame so theme or performance changes cannot resurrect it',
);
assert.match(
  sceneSource,
  /export type HeatCapacityCameraTransitionState = \{[\s\S]*targetPosition: \[number, number, number\];[\s\S]*target: \[number, number, number\];[\s\S]*durationMs: number;[\s\S]*elapsedMs: number;[\s\S]*remainingMs: number;/,
  'Camera refresh metadata should retain the in-flight transition target and remaining duration',
);
assert.match(
  sceneSource,
  /pendingInitialTransitionRef[\s\S]*if \(restoredTransition && !sceneReady\) return;[\s\S]*resumedFromElapsedMs: restoredTransition\.elapsedMs[\s\S]*useFrame\(\(\) => \{[\s\S]*remainingMs: Math\.max/,
  'CameraRig should freeze a restored transition until acknowledgement, then continue its original easing timeline',
);
assert.equal(
  (sceneSource.match(/if \(restoredInitialCameraPose && !sceneReadyReportedRef\.current\) return;/g) ?? []).length,
  3,
  'Strict Mode effect replay must not let reset, Demo focus, or Guide focus overwrite an exact restored camera pose',
);
assert.match(
  sceneSource,
  /cameraTransition: getCameraTransitionState\(\),[\s\S]*ultraVisualState: getUltraVisualState\(\),[\s\S]*hardSphereVisualCheckpoint: getHardSphereVisualCheckpoint\(\),/,
  'Every captured frame should carry camera, Ultra smoothing, and hard-sphere visual checkpoints',
);
assert.match(
  ultraModelSource,
  /export type HeatCapacityUltraVisualState = \{[\s\S]*gaugeNeedleRotationRad: number;[\s\S]*stopcockRotationRad: number;[\s\S]*pumpValveRotationRad: number;[\s\S]*pressureZeroRotationRad: number;[\s\S]*powerSwitchRotationRad: number;[\s\S]*pumpVisualWeight: number;/,
  'Ultra refresh state should include every internally smoothed control and gauge value',
);
assert.match(
  ultraModelSource,
  /const visualDelta = props\.restorePaused \? 0 : delta;[\s\S]*gaugeDisplayedRotationRef\.current[\s\S]*stopcockDisplayedAngleRef\.current[\s\S]*pumpValveDisplayedAngleRef\.current[\s\S]*pressureZeroDisplayedAngleRef\.current[\s\S]*powerSwitchDisplayedRotationRef\.current/,
  'Ultra smoothing should remain frozen behind the restored frame and resume only after acknowledgement',
);
assert.match(
  hardSphereLayerSource,
  /export type HeatCapacityHardSphereVisualCheckpoint = \{[\s\S]*particles: HeatCapacityHardSphereParticleCheckpoint\[\];[\s\S]*displayVisualState:[\s\S]*activeReleaseScheduleElapsedS:[\s\S]*kineticSpeedState:/,
  'Hard-sphere refresh state should preserve particle positions, release scheduling, and smoothed visual kinetics',
);
assert.doesNotMatch(
  sceneSource,
  /useGLTF\.preload|\.preload\([^)]*fd-ncd-c-ultra/,
  'The scene must not add module-level GLB preload side effects while implementing the restore gate',
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
assert.match(
  hardSphereLayerSource,
  /const ULTRA_HARD_SPHERE_CYLINDER_CENTER = new THREE\.Vector3\(-1\.399999976158142,\s*0\.7625,\s*0\);[\s\S]*const ULTRA_HARD_SPHERE_CYLINDER_RADIUS = 0\.48500001430511475;[\s\S]*const ULTRA_HARD_SPHERE_CYLINDER_HALF_HEIGHT = 0\.6325;/,
  'Ultra cylinder particles should use the measured glass_bottle_inner_air GLB center, radius, and scaled half-height',
);
assert.match(
  hardSphereLayerSource,
  /const ULTRA_HARD_SPHERE_PARTICLE_RADIUS = PARTICLE_RADIUS \* 0\.75;[\s\S]*particleRadius: ULTRA_HARD_SPHERE_PARTICLE_RADIUS[\s\S]*particleCountScale: 0\.525[\s\S]*pumpEntryRateScale: 0\.5/,
  'Ultra cylinder particles should keep the smaller radius and conservative 70-percent population, with half-rate pump entry',
);
assert.match(
  hardSphereLayerSource,
  /glassStopcockOpen,[\s\S]*pumpValveOpen,[\s\S]*pumpBulbState,[\s\S]*pumpFlowActive,[\s\S]*pumpFlowIntensity,/,
  'Hard-sphere visual inputs should use the glass stopcock angle and current pump flow path directly',
);
assert.match(
  hardSphereLayerSource,
  /pumpFlowActive: pumpPortActive[\s\S]*releaseExitBudget,[\s\S]*releaseFeedback,[\s\S]*releaseJustStopped,/,
  'Hard-sphere simulation steps should connect pump entry and canonical release feedback directly',
);

const glbNeedlePivot = runtimeGlbJson.nodes?.find((node) => node.name === 'HSL_PressureGauge_NeedlePivot');
assert.notEqual(glbNeedlePivot, undefined, 'Ultra GLB should expose the pressure gauge needle pivot');
assert.deepEqual(
  glbNeedlePivot?.rotation?.map((value) => Number(value.toFixed(6))),
  [0, 0, -0.87959, 0.475732],
  'Ultra GLB needle pivot should keep the authored low-pressure base transform used by the front-view pressure-gauge contract',
);
assert.match(
  ultraModelSource,
  /const getUltraPressureGaugeNeedleLocalRotation = \(modelAngle: number\) => PRESSURE_GAUGE_MIN_ROTATION - modelAngle;/,
  'Ultra pressure gauge should rotate from the authored low-pressure pose toward the right-side danger zone as semantic pressure increases',
);
const ultraNeedleRuntimeBlock = ultraModelSource.match(/const pressureNeedle = nodeMap\.get\('HSL_PressureGauge_NeedlePivot'\);[\s\S]*?\n    \}/)?.[0] ?? '';
assert.match(
  ultraNeedleRuntimeBlock,
  /getUltraPressureGaugeNeedleLocalRotation\(gaugeDisplayedRotationRef\.current\)/,
  'Ultra pressure gauge should drive the GLB needle through the GLB-local clockwise pressure delta',
);
[
  'PressureSensor_Wire_Black',
  'PressureSensor_Wire_Orange',
  'TemperatureSensor_Wire',
  'PressureSensor_SoftTube',
  'HSL_PressureSensor_SoftTube_WhiteCore',
  'HSL_PumpTube_Rebuilt',
  'HSL_CleanValve_Soft_Grey_Tube',
].forEach((nodeName) => {
  assert.match(
    ultraModelSource,
    new RegExp(`const ULTRA_HIDDEN_SOURCE_PIPELINE_NODE_NAMES = \\[[\\s\\S]*'${nodeName}'`),
    `Ultra GLB should hide the source baked pipe mesh ${nodeName} before drawing the single current runtime routing`,
  );
  assert.doesNotMatch(
    ultraModelSource,
    new RegExp(`setUltraNodeOwnMaterialColor\\(nodeMap,\\s*'${nodeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
    `Hidden source pipeline mesh ${nodeName} should not keep a misleading theme/material override`,
  );
});
assert.doesNotMatch(
  ultraModelSource,
  /ULTRA_(?:HIDDEN_LEGACY|REPLACED)_PIPELINE_NODE_NAMES/,
  'Ultra GLB should not keep old-scheme pipeline naming after consolidating on one current runtime routing',
);
assert.match(
  ultraModelSource,
  /const ULTRA_PRESSURE_PORT_CLUSTER_SPACING = 0\.045;/,
  'Ultra pressure orange/black box ports should use a tight grouped spacing instead of equal-spaced sensor-box sockets',
);
assert.match(
  ultraModelSource,
  /id: 'pressure-orange'[\s\S]*kind: 'pressure'[\s\S]*colorToken: 'orangeWire'[\s\S]*new THREE\.Vector3\(ULTRA_SENSOR_BOX_PRESSURE_PLUG_EXIT_X,\s*ULTRA_PRESSURE_ORANGE_BOX_PORT_Y,\s*0\.88\)/,
  'Orange pressure wire should terminate at the outer tail of the upper tight pressure-port plug on the sensor box',
);
assert.match(
  ultraModelSource,
  /id: 'pressure-black'[\s\S]*kind: 'pressure'[\s\S]*colorToken: 'blackWire'[\s\S]*new THREE\.Vector3\(ULTRA_SENSOR_BOX_PRESSURE_PLUG_EXIT_X,\s*ULTRA_PRESSURE_BLACK_BOX_PORT_Y,\s*0\.88\)/,
  'Black pressure wire should terminate at the outer tail of the lower tight pressure-port plug on the sensor box',
);
assert.match(
  ultraModelSource,
  /const ULTRA_DAQ_PLUG_EXIT_Z = 0\.575;[\s\S]*const ULTRA_DAQ_PLUG_OUTLET_Z = 0\.69;/,
  'Ultra runtime wire routes should begin with a short rounded outlet segment from the DAQ plug bodies instead of starting inside the sockets',
);
assert.match(
  ultraModelSource,
  /const ULTRA_SENSOR_BOX_PRESSURE_PLUG_EXIT_X = 0\.365;/,
  'Pressure wires should connect to the outer tail of the sensor-box plugs instead of terminating inside the socket holes',
);
assert.match(
  ultraModelSource,
  /id: 'pressure-orange'[\s\S]*new THREE\.Vector3\(1\.36,\s*0\.22,\s*ULTRA_DAQ_PLUG_EXIT_Z\),[\s\S]*new THREE\.Vector3\(1\.36,\s*0\.22,\s*ULTRA_DAQ_PLUG_OUTLET_Z\),[\s\S]*new THREE\.Vector3\(ULTRA_SENSOR_BOX_PRESSURE_PLUG_EXIT_X,\s*ULTRA_PRESSURE_ORANGE_BOX_PORT_Y,\s*0\.88\)/,
  'Orange pressure wire should visibly exit the DAQ plug before bending and land on the sensor-box plug tail',
);
assert.match(
  ultraModelSource,
  /id: 'pressure-black'[\s\S]*new THREE\.Vector3\(1\.62,\s*0\.22,\s*ULTRA_DAQ_PLUG_EXIT_Z\),[\s\S]*new THREE\.Vector3\(1\.62,\s*0\.22,\s*ULTRA_DAQ_PLUG_OUTLET_Z\),[\s\S]*new THREE\.Vector3\(ULTRA_SENSOR_BOX_PRESSURE_PLUG_EXIT_X,\s*ULTRA_PRESSURE_BLACK_BOX_PORT_Y,\s*0\.88\)/,
  'Black pressure wire should visibly exit the DAQ plug before bending and land on the sensor-box plug tail',
);
assert.match(
  ultraModelSource,
  /const ULTRA_TEMPERATURE_PROBE_EXIT_Y = 2\.126;[\s\S]*const ULTRA_TEMPERATURE_PROBE_CONNECTOR_OUTLET_Y = 2\.19;[\s\S]*const ULTRA_TEMPERATURE_PROBE_U_TURN_Y = 2\.28;[\s\S]*const ULTRA_TEMPERATURE_PROBE_U_TURN_Z = 0\.32;[\s\S]*const ULTRA_TEMPERATURE_ROUTE_MAX_Z = 0\.82;/,
  'Blue temperature wire should use the probe connector surface with a visible outlet and rounded U-turn',
);
assert.match(
  ultraModelSource,
  /id: 'temperature-blue'[\s\S]*kind: 'temperature'[\s\S]*colorToken: 'blueWire'[\s\S]*new THREE\.Vector3\(1\.1,\s*0\.22,\s*ULTRA_DAQ_PLUG_EXIT_Z\),[\s\S]*new THREE\.Vector3\(1\.1,\s*0\.22,\s*ULTRA_DAQ_PLUG_OUTLET_Z\),[\s\S]*new THREE\.Vector3\(0\.72,\s*0\.36,\s*ULTRA_TEMPERATURE_ROUTE_MAX_Z\),[\s\S]*new THREE\.Vector3\(-1\.10,\s*2\.06,\s*0\.38\),[\s\S]*new THREE\.Vector3\(-1\.25,\s*ULTRA_TEMPERATURE_PROBE_U_TURN_Y,\s*ULTRA_TEMPERATURE_PROBE_U_TURN_Z\),[\s\S]*new THREE\.Vector3\(-1\.25,\s*ULTRA_TEMPERATURE_PROBE_CONNECTOR_OUTLET_Y,\s*0\.18\),[\s\S]*new THREE\.Vector3\(-1\.25,\s*ULTRA_TEMPERATURE_PROBE_EXIT_Y,\s*0\.16\)/,
  'Blue temperature wire should leave the probe connector surface, loop through a visible U-turn, then run to the blue DAQ socket without dipping toward the pump bulb',
);
assert.match(
  ultraModelSource,
  /const ULTRA_PUMP_TUBE_FORWARD_REACH_Z = 1\.05;[\s\S]*const ULTRA_PUMP_TUBE_SAG_Y = 1\.30;/,
  'Pump tube route should define a long valve-direction reach and sag point before returning to the bulb',
);
assert.match(
  ultraModelSource,
  /id: 'pump-soft-tube'[\s\S]*new THREE\.Vector3\(-1\.565,\s*1\.94,\s*0\.516\),[\s\S]*new THREE\.Vector3\(-1\.565,\s*1\.92,\s*ULTRA_PUMP_TUBE_FORWARD_REACH_Z\),[\s\S]*new THREE\.Vector3\(-1\.28,\s*ULTRA_PUMP_TUBE_SAG_Y,\s*1\.42\),[\s\S]*new THREE\.Vector3\(0\.805,\s*0\.245,\s*1\.70\)/,
  'Pump tube should first extend outward from the valve, hang down naturally, then curve back to the pump bulb',
);
assert.match(
  ultraModelSource,
  /const ultraDisplayPowered = props\.powerOn;[\s\S]*const temperatureDisplay = ultraDisplayPowered \? formatAlignedSignalParts\(props\.temperatureSignalMv\) : null[\s\S]*const pressureDisplay = ultraDisplayPowered \? formatAlignedSignalParts\(props\.pressureSignalMv\) : null/,
  'Ultra digital display should blank both signal rows when power is off',
);
assert.match(
  ultraModelSource,
  /const formatAlignedSignalParts = \(value: number \| null\)[\s\S]*formatHeatCapacitySignalMv\(boundedValue\)[\s\S]*right: `\.\$\{fractionalPart\} mV`/,
  'Ultra digital display should reserve a sign slot, four integer slots, one decimal digit, and unit',
);
assert.match(
  ultraModelSource,
  /const ULTRA_DISPLAY_FRACTION_SLOTS = 1;/,
  'Ultra digital display should reserve exactly one decimal digit slot',
);
assert.match(
  ultraModelSource,
  /parts\.right\.match\(\/\\\.\(\\d\+\)\/\)/,
  'Ultra digital display should parse one or more decimal digits instead of requiring two',
);
assert.doesNotMatch(
  ultraModelSource.match(/const drawUltraAlignedSignal = \([\s\S]*?\n\};/)?.[0] ?? '',
  /\?\? '--'/,
  'Ultra digital display should not replace a missing second decimal digit with dash placeholders',
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
  /const ULTRA_THEME_VISUALS[\s\S]*light:[\s\S]*benchSurface: '#b8c6cc'[\s\S]*benchBackstop: '#8da0aa'[\s\S]*instrumentBody: '#f7f9f8'[\s\S]*frontPanel: '#c6d1d6'[\s\S]*sensorBox: '#2f383d'[\s\S]*softTube: '#f2efe6'[\s\S]*blueWire: '#0077c8'[\s\S]*orangeWire: '#d29a22'[\s\S]*blackWire: '#111827'[\s\S]*displayText: '#35f0c9'[\s\S]*powerSwitchOff: '#c92a2a'[\s\S]*powerSwitchOn: '#19a463'[\s\S]*dark:[\s\S]*benchSurface: '#6b7280'[\s\S]*benchBackstop: '#4b5563'[\s\S]*instrumentBody: '#d5dcdf'[\s\S]*frontPanel: '#b8c3c8'[\s\S]*powerSwitchOff: '#e15d59'[\s\S]*powerSwitchOn: '#35d987'/,
  'Ultra GLB should define separate light and dark visual palettes with a lighter bench, brighter host, and functional control colors',
);
assert.match(
  ultraModelSource,
  /applyUltraThemeVisuals\(nodeMap,\s*baseTransforms,\s*props\.sceneTheme\)/,
  'Ultra GLB should apply runtime material overrides from the current scene theme',
);
assert.match(
  ultraModelSource,
  /setUltraNodeOwnMaterialColor\(nodeMap,\s*'FD_NCD_C_InstrumentBody',\s*visuals\.instrumentBody,\s*\{\s*roughness:\s*0\.54,\s*metalness:\s*0\.03,\s*clearTexture:\s*true,\s*\}\);/,
  'Ultra GLB host body should clear baked material textures so the light instrument body stays visually distinct from the bench',
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
  /setUltraNodeOwnMaterialColor\(nodeMap,\s*'PressureSensor_Box',\s*visuals\.sensorBox/,
  'Ultra GLB light theme should recolor the sensor box separately from the host panel while current runtime routes own tube and wire colors',
);
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
  /const resolveUltraActionControl = useCallback\([\s\S]*const panelResolvedControl = resolveUltraPanelPointerControl\(control, clientX, clientY\)[\s\S]*resolveUltraClickControl\(control, panelResolvedControl, props\.hoveredControl\)[\s\S]*const handleUltraControlClick = useCallback\([\s\S]*const clientX = event\.clientX;[\s\S]*const clientY = event\.clientY;[\s\S]*const resolvedControl = resolveUltraActionControl\(control, clientX, clientY\)/,
  'Ultra GLB clicks should use the same panel disambiguation before dispatching power-switch and zero-knob behavior',
);
assert.match(
  ultraModelSource,
  /const resolveUltraClickControl = \([\s\S]*control === 'powerSwitch'[\s\S]*panelResolvedControl === 'pressureZero'[\s\S]*hoveredControl === 'powerSwitch'[\s\S]*return 'powerSwitch'/,
  'Ultra GLB power-switch clicks should preserve a hovered power-switch decision instead of being swallowed by the adjacent pressure-zero hitbox',
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
  /const handleUltraControlWheel = useCallback\([\s\S]*const resolvedControl = resolveUltraPanelPointerControl\(control, event\.clientX, event\.clientY\)[\s\S]*if \(resolvedControl !== 'pressureZero'\) return;[\s\S]*absorbUltraPointerEvent\(event\);[\s\S]*if \(!props\.pressureZeroInteractionEnabled\) \{[\s\S]*return;[\s\S]*\}[\s\S]*const requestedDelta = \(event\.deltaY < 0 \? PRESSURE_ZERO_FINE_ANGLE_STEP_DEG : -PRESSURE_ZERO_FINE_ANGLE_STEP_DEG\)\s*\*\s*PRESSURE_ZERO_DRAG_DIRECTION;[\s\S]*props\.onPressureZeroFineAdjust\([\s\S]*boundedDelta,[\s\S]*pressureZeroWheelGestureRef\.current\.getInteractionId\(now\)/,
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
const ultraControlMotionInvalidationEnd = ultraModelSource.search(/  useFrame\(\(\{ clock \}, delta\) => \{/);
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
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*position: \[3\.72,\s*4\.702,\s*5\.581\][\s\S]*target: \[0\.274,\s*0\.665,\s*-0\.23\][\s\S]*fov: 36[\s\S]*responsiveFov:[\s\S]*aspect: 1\.35[\s\S]*narrowAspect: 0\.95[\s\S]*fov: 52[\s\S]*wideAspect: 3[\s\S]*wideFov: 56/,
  'Ultra default view should use the captured GLB position and target while widening FOV from the base value for resized canvases',
);
assert.match(
  sceneSource,
  /camera: \{[\s\S]*position: restoredInitialCameraPose\?\.position \?\? cameraViewScheme\.defaultView\.position,[\s\S]*fov: restoredInitialCameraPose\?\.fov \?\? cameraViewScheme\.fov/,
  'Canvas should apply a restored camera pose on its first frame and otherwise use the active scheme defaults',
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
  /control: 'stopcock', anchorNodeName: 'Stopcock_THandle', size: \[0\.42, 0\.24, 0\.64\], offset: \[0\.18, 0, 0\]/,
  'Ultra stopcock hitbox should include the outer handle lever while staying anchored to the handle node',
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
const ultraPumpBulbVisualTargetSection = ultraModelSource.match(/id: 'pumpBulb'[\s\S]*?focusShellPulsePopScale: 1\.11,/)?.[0] ?? '';
assert.match(
  ultraPumpBulbVisualTargetSection,
  /focusShellNodeNames:\s*\['Pump_Bulb', 'Pump_RearSoftEnd', 'Pump_Nozzle', 'Pump_NozzleClamp'\]/,
  'Ultra pump-bulb guide cue should copy the visible pump bulb assembly mesh shells like other focus targets',
);
assert.doesNotMatch(
  ultraPumpBulbVisualTargetSection,
  /focusCueKind:\s*'pumpBulbContour'/,
  'Ultra pump-bulb guide cue should not keep the old dedicated contour cue path',
);
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
  /const resolveUltraClickControl = \([\s\S]*panelResolvedControl === 'pumpValve' && hoveredControl === 'stopcock'[\s\S]*const handleUltraControlClick = useCallback\([\s\S]*const resolvedControl = resolveUltraActionControl\(control, clientX, clientY\)[\s\S]*const runControlClick = \(\) => \{[\s\S]*if \(resolvedControl === 'powerSwitch'\)[\s\S]*else if \(resolvedControl === 'stopcock'\)[\s\S]*else if \(resolvedControl === 'pumpValve'\)/,
  'Ultra GLB valve clicks should honor the current hover target so pump-valve depth does not steal stopcock-handle clicks',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*demoFocusControlId=\{props\.demoFocusControlId\}[\s\S]*demoFocusPulseActive=\{props\.demoFocusPulseActive\}[\s\S]*interactionQualityReduced=\{interactionQualityReduced\}[\s\S]*visualEffects=\{\{[\s\S]*demoHaloColor: scenePalette\.effects\.demoHalo[\s\S]*nonBulbHoverHaloOpacity: scenePalette\.effects\.nonBulbHoverHaloOpacity[\s\S]*pumpBulbHoverHaloOpacity: scenePalette\.effects\.pumpBulbHoverHaloOpacity/,
  'Heat Capacity scene should pass the procedural demo/guide pulse palette into the Ultra GLB visual layer',
);
assert.match(
  sceneSource,
  /dark:\s*\{[\s\S]*focusShellColor:\s*'#67e8f9'[\s\S]*focusShellRimColor:\s*'#a5f3fc'[\s\S]*focusShellBlendMode:\s*'additive'[\s\S]*light:\s*\{[\s\S]*focusShellColor:\s*'#0ea5e9'[\s\S]*focusShellRimColor:\s*'#22d3ee'[\s\S]*focusShellBlendMode:\s*'normal'/,
  'Ultra focus shells should use the same higher-contrast guide color family in dark and light themes',
);
assert.match(
  sceneSource,
  /focusShellColor: scenePalette\.effects\.focusShellColor[\s\S]*focusShellRimColor: scenePalette\.effects\.focusShellRimColor[\s\S]*focusShellBlendMode: scenePalette\.effects\.focusShellBlendMode[\s\S]*focusShellPulseRate: scenePalette\.effects\.focusShellPulseRate/,
  'Heat Capacity scene should pass the theme-specific focus shell pulse values into the Ultra GLB visual layer',
);
assert.match(
  sceneSource,
  /const sceneShouldAnimate =[\s\S]*props\.demoFocusPulseActive[\s\S]*Boolean\(props\.guideRollbackAnimation\)/,
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
  /focusShellNodeNames: \['FD_NCD_C_PowerSwitch_Base', 'HSL_PowerSwitch_Inset_Frame_Lip'\][\s\S]*focusShellNodeNames: \['FD_NCD_C_ZeroAdjustKnob'\][\s\S]*focusShellNodeNames: \['Stopcock_THandle', 'Stopcock_HandleStem', 'Stopcock_RotatingPlugCore'\][\s\S]*focusShellNodeNames: \['InletValue_Pivot'\][\s\S]*focusShellNodeNames: \['Pump_Bulb', 'Pump_RearSoftEnd', 'Pump_Nozzle', 'Pump_NozzleClamp'\]/,
  'Ultra guide/demo focus should pulse real GLB shell nodes for compact controls and the pump bulb',
);
assert.match(
  ultraModelSource,
  /id: 'pumpBulb'[\s\S]*anchorNodeName: 'Pump_Bulb'[\s\S]*focusShellNodeNames: \['Pump_Bulb', 'Pump_RearSoftEnd', 'Pump_Nozzle', 'Pump_NozzleClamp'\]/,
  'Ultra pump-bulb focus cue should use the visible pump bulb assembly surfaces',
);
assert.doesNotMatch(
  ultraModelSource,
  /focusCueKind|HSL_UltraPumpBulbFocusCue|HSL_UltraPumpBulbFocusCueBandA|HSL_UltraPumpBulbFocusCueBandB/,
  'Ultra pump-bulb focus cue should delete the old dedicated contour cue path',
);
assert.match(
  ultraModelSource,
  /const focusShellUsesSurfaceScale = focusMode && focusShellMeshes\.length > 0;[\s\S]*localMatrixRef\.current\.compose\(\s*anchorPositionRef\.current,\s*anchorQuaternionRef\.current,\s*focusShellUsesSurfaceScale \? anchorScaleRef\.current : ULTRA_HITBOX_UNIT_SCALE,\s*\)/,
  'Ultra focus shell halos should preserve the anchor node scale so scaled GLB meshes such as Pump_Bulb do not expand into their unscaled geometry',
);
assert.match(
  ultraModelSource,
  /id: 'powerSwitch'[\s\S]*focusShellPulsePopScale: 1\.42[\s\S]*id: 'pressureZero'[\s\S]*focusShellPulsePopScale: 1\.34[\s\S]*id: 'pumpValve'[\s\S]*focusShellPulsePopScale: 1\.28/,
  'Small Ultra focus targets should use target-specific peak scales so range expansion is visible when opacity peaks',
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
  /const wavePulse = getUltraGuideCuePulse\(focusPulseElapsed, effects\.focusShellPulseRate\);[\s\S]*const pulsePeakScale = target\.focusShellPulsePopScale \?\? effects\.focusShellPulseStartScale;[\s\S]*pulseGroup\.scale\.setScalar\(THREE\.MathUtils\.lerp\(effects\.focusShellPulseStartScale, pulsePeakScale, wavePulse\)\);[\s\S]*shellPulseMaterial\.opacity = effects\.focusShellPulseOpacity \* wavePulse/,
  'Ultra focus shell pulse should use a smooth closed-loop wave so scale and opacity return to the start without a visible jump',
);
assert.match(
  ultraModelSource,
  /const focusPulseStartedAtRef = useRef<number \| null>\(null\);[\s\S]*if \(focusPulseStartedAtRef\.current === null\) focusPulseStartedAtRef\.current = clock\.elapsedTime;[\s\S]*const focusPulseElapsed = Math\.max\(0, clock\.elapsedTime - focusPulseStartedAtRef\.current\);[\s\S]*const wavePulse = getUltraGuideCuePulse\(focusPulseElapsed, effects\.focusShellPulseRate\);/,
  'Ultra focus shell pulse should start its pop phase when the guide/demo focus appears instead of using a random global clock phase',
);
assert.match(
  ultraModelSource,
  /const getUltraGuideCuePulse = \(elapsedS: number, cyclesPerSecond = 0\.58\) => \{[\s\S]*const phase =[\s\S]*0\.5 - 0\.5 \* Math\.cos\(phase \* Math\.PI \* 2\)[\s\S]*\};/,
  'Ultra guide/demo cues should use the same smooth cosine loop as the procedural scene',
);
assert.match(
  ultraModelSource,
  /function UltraPowerSwitchSkirtedRocker[\s\S]*focusPulseRef = useRef<THREE\.Mesh \| null>\(null\);[\s\S]*focusPulseMaterial = useMemo\(\(\) => new THREE\.MeshBasicMaterial\(\{[\s\S]*depthTest: true[\s\S]*side: THREE\.BackSide[\s\S]*const wavePulse = getUltraGuideCuePulse\(focusPulseElapsed\);[\s\S]*focusPulse\.scale\.set\(pulseScale, pulseScale, pulseDepthScale\);[\s\S]*focusPulseMaterial\.opacity = 0\.38 \* wavePulse;[\s\S]*name="HSL_PowerSwitch_SkirtedRockerFocusPulse"[\s\S]*scale=\{\[1\.42, 1\.42, 1\.18\]\}/,
  'Ultra runtime power switch rocker should get the same smooth closed-loop pulse as GLB shell nodes',
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
  /id: 'stopcock'[\s\S]*anchorNodeName: 'Stopcock_THandle'[\s\S]*size: \[0\.36, 0\.18, 0\.60\][\s\S]*offset: \[0\.18, 0, 0\]/,
  'Ultra stopcock hover hint should visually cover the outer handle lever hit area',
);
assert.match(
  ultraModelSource,
  /hoverMesh\.scale\.setScalar\(focusMode[\s\S]*\? effects\.demoHaloBaseScale \+ staticPulse \* effects\.demoHaloPulseScale[\s\S]*: target\.hoverScale \?\? 1\)/,
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
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*instrument:[\s\S]*position: \[2\.78,\s*1\.16,\s*3\.85\][\s\S]*target: \[2\.24,\s*0\.06,\s*0\.28\][\s\S]*fov: 32[\s\S]*pump:[\s\S]*position: \[2\.34,\s*1\.24,\s*3\.55\][\s\S]*target: \[0\.98,\s*0\.34,\s*0\.28\][\s\S]*fov: 36/,
  'Ultra mode should keep model-specific focus views for instrument and pump instead of falling back to the GLB default view',
);
assert.doesNotMatch(
  sceneSource,
  /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*stopcock:/,
  'Ultra mode should not keep the removed shared stopcock and pump-valve focus view',
);
assert.match(
  sceneSource,
  /if \(focusMode !== 'none'\) return;[\s\S]*getCameraFovForAspect\(cameraViewScheme, aspect\)[\s\S]*const startFov = camera\.fov[\s\S]*const nextFov = focusView[\s\S]*\? focusView\.fov \?\? cameraViewScheme\.fov[\s\S]*: getCameraFovForAspect\(cameraViewScheme, aspect\)[\s\S]*startFov,[\s\S]*targetFov: nextFov[\s\S]*camera\.fov = THREE\.MathUtils\.lerp\(runtime\.state\.startFov, runtime\.state\.targetFov, eased\)/,
  'Ultra focus views should animate back to the base model FOV so short-wide canvases do not shrink focused controls',
);
assert.doesNotMatch(
  sceneSource,
  /props\.performanceMode === 'ultra' && focusMode !== 'none'/,
  'Ultra mode should no longer force focused views back to the default camera',
);
assert.match(
  sceneSource,
  /const orbitControlsEnabled = focusMode === 'none' && !\(props\.cameraInteractionLocked \?\? props\.interactionLocked\);/,
  'Ultra focus mode should keep the same focus lock while allowing completed teaching states to inspect the model camera',
);
assert.match(
  sceneSource,
  /<HeatCapacityUltraInstrumentModel[\s\S]*pressureZeroInteractionEnabled=\{focusMode === 'instrument'\}[\s\S]*pumpBulbInteractionEnabled=\{focusMode === 'pump'\}[\s\S]*onFocus=\{setFocusMode\}/,
  'Heat Capacity scene should keep pressure-zero and pump-bulb operation behind their focused-mode gates',
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
  'Ultra pump bulb clicks should remain inactive outside pump focus so double-clicking only enters focus',
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
  /const handleUltraControlDoubleClick = useCallback\([\s\S]*if \(resolvedControl === 'powerSwitch' \|\| resolvedControl === 'pressureZero'\) \{[\s\S]*props\.onFocus\('instrument'\);[\s\S]*\} else if \(resolvedControl === 'pumpBulb'\) \{[\s\S]*props\.onFocus\('pump'\);[\s\S]*\}/,
  'Ultra GLB double-click focus entry should map instrument controls and pump bulb to their matching focus modes',
);
assert.doesNotMatch(
  ultraModelSource,
  /props\.onFocus\('stopcock'\)|type UltraValveFocusControl|onValveFocusAnchor|openUltraValveFocusBubble/,
  'Ultra GLB should not keep the removed shared stopcock and pump-valve focus entry',
);
assert.match(
  ultraModelSource,
  /const ULTRA_DOUBLE_CLICK_GUARD_MS = 220;[\s\S]*const pendingUltraSingleClickRef = useRef<number \| null>\(null\);[\s\S]*const clearPendingUltraSingleClick = useCallback\(\(\) => \{[\s\S]*window\.clearTimeout\(pendingUltraSingleClickRef\.current\)[\s\S]*const scheduleUltraSingleClick = useCallback\(\(run: \(\) => void\) => \{[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*run\(\);[\s\S]*ULTRA_DOUBLE_CLICK_GUARD_MS/,
  'Ultra GLB non-focused clicks should still defer single-click side effects briefly so a fast second click can become focus instead',
);
assert.match(
  ultraModelSource,
  /const handleUltraControlClick = useCallback\([\s\S]*const resolvedControl = resolveUltraActionControl\(control, clientX, clientY\)[\s\S]*const runControlClick = \(\) => \{[\s\S]*props\.onPowerToggle\(\)[\s\S]*props\.onPumpValveToggle\(\)[\s\S]*props\.onPumpBulbPress\(\);[\s\S]*const shouldGuardSingleClick = props\.focusMode === 'none' && \([\s\S]*resolvedControl === 'powerSwitch'[\s\S]*resolvedControl === 'pumpBulb'[\s\S]*if \(!shouldGuardSingleClick\) \{[\s\S]*runControlClick\(\);[\s\S]*return;[\s\S]*\}[\s\S]*scheduleUltraSingleClick\(runControlClick\);/,
  'Ultra GLB should protect only controls with remaining double-click focus entries while running valve clicks directly',
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
  /data-heat-capacity-mode="demo"[\s\S]*switchHeatCapacityMode\('demo'\)/,
  'Demo mode should start or restore directly now every quality profile supports teaching highlights',
);
assert.match(
  workbenchSource,
  /data-heat-capacity-mode="guide"[\s\S]*switchHeatCapacityMode\('guide'\)/,
  'Guide mode should start or restore directly now every quality profile supports teaching highlights',
);
assert.doesNotMatch(
  workbenchSource,
  /heatCapacityUltraModelIntegrationReady|heatCapacityTeachingModesAvailable|heatCapacityDeferredModeDisabled/,
  'Workbench should delete old model readiness gates after the quality architecture is rebuilt',
);

console.log('heatCapacityUltraGlbIntegration tests passed');
