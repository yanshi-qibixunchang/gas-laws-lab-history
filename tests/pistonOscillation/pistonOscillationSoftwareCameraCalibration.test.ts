import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS,
  PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA,
  PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA,
  PISTON_OSCILLATION_SCALE_READING_WINDOW_MM,
  getPistonHeightAdjustmentCameraDefinition,
  getPistonScaleReadingCenterHeightMm,
} from '../../src/features/pistonOscillation/pistonOscillationFocusViews.ts';
import { PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS } from '../../src/features/pistonOscillation/pistonOscillationCameraCalibrationReview.ts';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '..', '..');
const readSource = (relativePath: string) => fs.readFileSync(
  path.join(repositoryRoot, relativePath),
  'utf8',
);

const indexSource = readSource('src/app/index.tsx');
const frameSource = readSource('src/app/WorkbenchAspectFrame.tsx');
const pageSource = readSource(
  'src/features/pistonOscillation/PistonOscillationSoftwareCameraCalibrationPage.tsx',
);
const interactionSource = readSource(
  'src/features/pistonOscillation/PistonOscillationFocusInteractionPreviewPage.tsx',
);
const interactiveModelSource = readSource(
  'src/features/pistonOscillation/PistonOscillationInteractiveModel.tsx',
);
const focusViewsSource = readSource(
  'src/features/pistonOscillation/pistonOscillationFocusViews.ts',
);

assert.match(
  indexSource,
  /import\.meta\.env\.DEV[\s\S]*pistonCameraCalibration[\s\S]*PistonOscillationSoftwareCameraCalibrationPage/,
  'the software-size camera calibration page must remain behind a development-only query switch',
);
assert.match(
  frameSource,
  /WORKBENCH_FRAME_WIDTH = 1440[\s\S]*WORKBENCH_FRAME_HEIGHT = 810[\s\S]*forceFixed/,
  'the calibration page must be able to reuse the production 1440 by 810 logical frame at every browser size',
);
assert.match(
  pageSource,
  /WorkbenchAspectFrame forceFixed[\s\S]*studio-left-collapsed[\s\S]*studio-params-collapsed/,
  'the camera tool must reproduce the piston workspace with both sidebars collapsed and the formal split ratio',
);
assert.match(
  pageSource,
  /--studio-live-preview-ratio[\s\S]*WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO[\s\S]*--studio-live-realtime-ratio/,
  'the camera tool must use the shared piston split-ratio constant',
);
for (const viewId of [
  'overview',
  'pistonFocus',
  'heightAdjustmentFocus',
  'hoseFocus',
  'screwOperationView',
  'scaleReadingView',
]) {
  assert.match(pageSource, new RegExp(`id: '${viewId}'`));
}
assert.match(
  pageSource,
  /heightAdjustmentFocus[\s\S]*label: '高度调节'[\s\S]*主视角随顶部平台高度连续平移/,
  'the height-adjustment calibration view must explicitly cover continuous main-camera following',
);
assert.match(
  pageSource,
  /scaleReadingView[\s\S]*label: '刻度读取操作镜'[\s\S]*正交视角跟随石墨活塞下沿/,
  'the sixth calibration view must cover the scale-reading operation mirror',
);
assert.match(
  pageSource,
  /cameraCalibrationHeightMm=\{[\s\S]*heightCalibrationSelected \? calibrationHeightMm/,
  'the selected calibration height must drive the instrument workspace',
);
assert.match(
  pageSource,
  /PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS[\s\S]*useState<CalibrationCaptureMap>[\s\S]*cameraCalibrationInitialSnapshot=\{selectedSnapshot\}[\s\S]*cameraCalibrationReviewSnapshots=\{captures\}/,
  'the temporary review page must preload and apply the six user-confirmed camera snapshots',
);
assert.match(
  interactionSource,
  /cameraCalibrationView === 'scaleReadingView'[\s\S]*cameraCalibrationReviewSnapshots\?\.heightAdjustmentFocus[\s\S]*cameraCalibrationReviewSnapshots\?\.screwOperationView[\s\S]*cameraCalibrationReviewSnapshots\?\.scaleReadingView/,
  'the temporary review must compose the confirmed main view with the confirmed operation-mirror view',
);
assert.match(
  pageSource,
  /aria-label="动态跟随高度"[\s\S]*step="0\.1"[\s\S]*\[20, 50, 80\]/,
  'the calibration page must provide continuous height control and 20, 50, and 80 mm checks',
);
assert.match(
  interactionSource,
  /const \[hoseState, setHoseState\] = useState<HosePreviewState>\([\s\S]*guideInitialInstrumentState\?\.hoseState \?\? 'disconnected'/,
  'the piston workspace must keep hose-disconnected standby as its default while allowing a persisted Guide checkpoint to restore it',
);
assert.match(
  interactionSource,
  /HeightFollowingCameraRig[\s\S]*heightDeltaM[\s\S]*camera\.position\.y \+= heightDeltaM[\s\S]*controls\.target\.y \+= heightDeltaM/,
  'height adjustment must translate camera position and target by the same continuous height delta',
);
assert.match(
  interactionSource,
  /ScaleReadingCameraRig[\s\S]*Piston_Graphite[\s\S]*Cylinder_Pyrex[\s\S]*visibleHalfHeightM[\s\S]*pistonBounds\.min\.y/,
  'the orthographic scale camera must track the graphite-piston lower edge and clamp against glass geometry',
);
assert.match(
  interactionSource,
  /camera\.zoom = initialPose\.zoom \* \(size\.height \/ initialPose\.viewport\.height\)/,
  'the orthographic scale camera must preserve its logical visible range when the fixed workbench is scaled',
);
assert.match(
  interactionSource,
  /cameraCalibrationView !== 'screwOperationView'[\s\S]*cameraCalibrationView !== 'scaleReadingView'[\s\S]*CameraCalibrationBridge/,
  'operation-mirror calibration must not compete with the main canvas capture bridge',
);
assert.match(
  interactionSource,
  /className="piston-focus-interaction-operation-mirror-canvas"[\s\S]*<PerspectiveCamera[\s\S]*makeDefault=\{screwOperationMirrorActive\}[\s\S]*<OrthographicCamera[\s\S]*makeDefault=\{scaleReadingOperationMirrorActive\}[\s\S]*scaleReadingOperationMirrorActive \? \([\s\S]*<ScaleReadingCameraRig/,
  'formal and calibration scale reading must switch the resident operation mirror to its orthographic camera rig',
);
assert.match(
  interactionSource,
  /scaleReadingDetail=\{scaleReadingOperationMirrorActive\}[\s\S]*<group visible=\{screwOperationMirrorActive\}>[\s\S]*<group visible=\{scaleReadingOperationMirrorActive\}>[\s\S]*scaleReadingVisualEnhancement[\s\S]*minZoom=\{scaleReadingOperationMirrorActive \? 500 : 5_000\}[\s\S]*maxZoom=\{25_000\}/,
  'the preloaded scale mirror must retain its local detail presentation and wide zoom range without changing the screw mirror materials',
);
assert.match(
  interactionSource,
  /screwOperationMirrorActive \? \([\s\S]*<directionalLight[\s\S]*color="#f2f6f8"[\s\S]*intensity=\{0\.65\}[\s\S]*position=\{\[1, 0\.12, -0\.08\]\}/,
  'the active screw-operation mirror must illuminate the outward screw face',
);
assert.doesNotMatch(
  interactionSource,
  /scaleReadingVisualEnhancement=\{scaleReadingOperationMirrorActive\}/,
  'camera switching must not rebuild one model between normal and scale-enhanced presentation',
);
assert.match(
  interactiveModelSource,
  /scaleReadingVisualEnhancement = false[\s\S]*createInteractiveModelInstance\(sourceScene, scaleReadingVisualEnhancement\)/,
  'the interactive model must leave scale-reading presentation disabled by default',
);
for (const nodeName of [
  'Piston_Graphite',
  'Cylinder_Pyrex',
  'ScaleTicks_Major_10mm',
  'ScaleTicks_Middle_5mm',
  'ScaleTicks_Minor_1mm',
  'ScaleTicks_Major_10mm_DarkOutline',
  'ScaleTicks_Middle_5mm_DarkOutline',
  'ScaleTicks_Minor_1mm_DarkOutline',
]) {
  assert.match(interactiveModelSource, new RegExp(`['"]${nodeName}['"]`));
}
assert.match(
  interactiveModelSource,
  /SCALE_READING_TICK_OUTLINE_NODE_NAMES\.forEach[\s\S]*getRequiredPistonOscillationObject\(root, nodeName\)\.visible = false/,
  'the scale-reading mirror must omit the three dark outline layers',
);
assert.match(
  interactiveModelSource,
  /createScaleReadingTickMaterial[\s\S]*material\.color\.set\('#ffffff'\)[\s\S]*material\.toneMapped = false/,
  'the remaining scale ticks must render as pure white without tone-mapping',
);
assert.match(
  interactiveModelSource,
  /SCALE_READING_MAIN_TICK_NODE_NAMES\.forEach[\s\S]*const geometry = mesh\.geometry\.clone\(\)[\s\S]*geometry\.scale\(1, 0\.45, 1\)[\s\S]*ownedGeometries\.add\(geometry\)/,
  'scale ticks must be thinned on owned geometry clones rather than the shared GLB geometry',
);
assert.match(
  interactiveModelSource,
  /SCALE_READING_GRAPHITE_BOTTOM_BLUE[\s\S]*SCALE_READING_GRAPHITE_TOP_BLACK[\s\S]*vertexColors: true[\s\S]*color\.lerpColors\([\s\S]*SCALE_READING_GRAPHITE_BOTTOM_BLUE,[\s\S]*SCALE_READING_GRAPHITE_TOP_BLACK,[\s\S]*normalizedY[\s\S]*geometry\.setAttribute\('color'/,
  'the graphite piston must interpolate from a blue lower edge to a black upper edge on owned vertex colors',
);
assert.match(
  interactiveModelSource,
  /createScaleReadingGraphiteMaterial[\s\S]*MeshStandardMaterial[\s\S]*createScaleReadingGlassMaterial[\s\S]*MeshPhysicalMaterial[\s\S]*ownedMaterials\.add\(material\)/,
  'scale-reading graphite and glass detail materials must stay local to the operation mirror instance',
);
assert.match(
  interactionSource,
  /minimumCenterWorldY <= maximumCenterWorldY[\s\S]*THREE\.MathUtils\.clamp[\s\S]*: pistonBounds\.min\.y/,
  'zooming beyond the glass height must keep the graphite lower edge centered without an inverted clamp range',
);
assert.match(
  interactionSource,
  /CameraCalibrationBridge[\s\S]*THREE\.OrthographicCamera[\s\S]*visibleHeightMm/,
  'orthographic calibration capture must export its visible range',
);
assert.match(
  interactionSource,
  /normalizedZoom[\s\S]*camera\.zoom \* \(height \/ size\.height\)[\s\S]*zoom: roundCameraValue\(normalizedZoom\)[\s\S]*height \/ normalizedZoom/,
  'orthographic capture must normalize zoom back to the logical operation-mirror viewport',
);

const heightDefinitions = [20, 50, 80].map(getPistonHeightAdjustmentCameraDefinition);
assert.deepEqual(
  heightDefinitions.map((definition) => Number(definition.position[1].toFixed(4))),
  [0.3442, 0.3742, 0.4042],
);
assert.deepEqual(
  heightDefinitions.map((definition) => Number(definition.target[1].toFixed(4))),
  [0.2756, 0.3056, 0.3356],
);
for (const definition of heightDefinitions) {
  assert.equal(definition.position[0], 0.3184);
  assert.equal(definition.position[2], 0.4014);
  assert.equal(definition.target[0], 0.1435);
  assert.equal(definition.target[2], 0.0646);
  assert.equal(definition.fov, 38);
}
assert.deepEqual([20, 50, 80].map(getPistonScaleReadingCenterHeightMm), [20, 50, 80]);
assert.equal(getPistonScaleReadingCenterHeightMm(0), 6);
assert.ok(
  Math.abs(
    PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA.viewport.height
      / PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA.zoom * 1000
      - PISTON_OSCILLATION_SCALE_READING_WINDOW_MM,
  ) < 0.0001,
  'the rounded confirmed orthographic zoom must preserve the reviewed visible height',
);
assert.match(
  focusViewsSource,
  /position: \[0\.1506, 0\.2693, 0\.237\][\s\S]*target: \[0\.1303, 0\.2693, 0\.092\][\s\S]*zoom: 4_027\.9926/,
  'the formal scale-reading camera must use the user-confirmed orthographic pose and range',
);

assert.deepEqual(
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.overview.position,
  [0.4494, 0.3765, 0.7484],
);
assert.deepEqual(
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.heightAdjustmentFocus,
  {
    view: 'heightAdjustmentFocus',
    projection: 'perspective',
    viewport: { width: 796, height: 500, aspect: 1.592 },
    position: [0.3184, 0.4042, 0.4014],
    target: [0.1435, 0.3356, 0.0646],
    fov: 38,
    zoom: 1,
    distance: 0.3856,
    near: 0.001,
    far: 20,
    calibrationHeightMm: 80,
  },
);
assert.equal(
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.scaleReadingView.zoom,
  4027.9926,
);
assert.equal(
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.scaleReadingView
    .orthographic?.visibleHeightMm,
  61.8174,
);
assert.equal(
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.scaleReadingView
    .calibrationHeightMm,
  80,
);
assert.deepEqual(
  PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA.position,
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.overview.position,
  'the reviewed overview must now be the formal software camera',
);
assert.deepEqual(
  PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS.screwOperationView.position,
  PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS.screwOperationView.position,
  'the reviewed screw-operation view must now be the formal operation-mirror camera',
);
assert.match(
  interactionSource,
  /cameraCalibrationView === 'screwOperationView'[\s\S]*cameraCalibrationView === 'heightAdjustmentFocus'[\s\S]*\? 'pistonFocus'/,
  'height-adjustment calibration must reuse the piston workspace overlays while its camera is calibrated',
);
assert.match(
  interactionSource,
  /heightAdjustmentCalibrationActive\s*\? 'heightAdjustmentFocus'\s*: mode/,
  'the focus panel must expose the height-adjustment calibration state',
);
assert.match(
  interactionSource,
  /heightAdjustmentCalibrationActive\s*\? interactionCopy\.heightAdjustmentTitle/,
  'the focus panel must label height adjustment explicitly in the active interface language',
);
assert.match(
  pageSource,
  /source: 'pistonSoftwareCameraCalibration'[\s\S]*logicalViewport[\s\S]*consoleHeight: 156[\s\S]*sidebars: 'collapsed'/,
  'copied calibration data must describe the formal software layout used during capture',
);
assert.match(
  interactionSource,
  /CameraCalibrationBridge[\s\S]*gl\.domElement\.offsetWidth[\s\S]*position[\s\S]*target[\s\S]*distance/,
  'camera capture must read the live canvas viewport and camera controls instead of reusing stale preview dimensions',
);
assert.match(
  interactionSource,
  /cameraCalibrationView === 'screwOperationView'[\s\S]*controlsRef=\{mirrorControlsRef\}[\s\S]*CameraCalibrationBridge[\s\S]*view=\{cameraCalibrationView\}/,
  'operation-mirror calibration must adjust and capture the real operation-mirror camera',
);

console.log('Piston-oscillation software-size camera calibration checks passed.');
