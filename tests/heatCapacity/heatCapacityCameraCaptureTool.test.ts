import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const scenePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const stylePath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.css');
const packagePath = join(process.cwd(), 'package.json');
const agentsPath = join(process.cwd(), 'AGENTS.md');

assert.equal(existsSync(scenePath), true, 'heat-capacity instrument scene should exist');
assert.equal(existsSync(stylePath), true, 'workbench style file should exist');
assert.equal(existsSync(packagePath), true, 'package.json should exist');
assert.equal(existsSync(agentsPath), true, 'AGENTS.md should exist');

const sceneSource = readFileSync(scenePath, 'utf8');
const styleSource = readFileSync(stylePath, 'utf8');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const agentsSource = readFileSync(agentsPath, 'utf8');

assert.equal(
  packageJson.scripts?.['dev:temp'],
  'vite --host 127.0.0.1 --port 5184 --strictPort',
  'project should expose a strict temporary-output dev server that does not occupy the fixed 5174 preview port',
);
assert.equal(
  packageJson.dependencies?.three,
  '0.182.0',
  'Three must stay exactly pinned to the Clock-compatible runtime used by React Three Fiber 8',
);
assert.equal(
  packageJson.devDependencies?.['@types/three'],
  '0.182.0',
  'Three runtime and declaration versions must stay aligned',
);
assert.match(
  agentsSource,
  /## Temporary Output Port[\s\S]*`5184`[\s\S]*npm\.cmd run dev:temp[\s\S]*http:\/\/127\.0\.0\.1:5184\/\?cameraCapture=1/,
  'AGENTS.md should document the dedicated temporary output port and camera capture entrypoint',
);
assert.match(
  sceneSource,
  /const HEAT_CAPACITY_CAMERA_CAPTURE_QUERY_PARAM = 'cameraCapture';[\s\S]*const HEAT_CAPACITY_CAMERA_CAPTURE_STORAGE_KEY = 'hsl_heat_capacity_camera_capture_latest';/,
  'camera capture tool should use stable query and storage keys',
);
assert.match(
  sceneSource,
  /const isHeatCapacityCameraCaptureEnabled = \(\) => \([\s\S]*import\.meta\.env\.DEV[\s\S]*new URLSearchParams\(window\.location\.search\)\.get\(HEAT_CAPACITY_CAMERA_CAPTURE_QUERY_PARAM\) === '1'/,
  'camera capture UI should only activate in development when ?cameraCapture=1 is present',
);
assert.match(
  sceneSource,
  /type HeatCapacityCameraViewCapturePayload = \{[\s\S]*performanceMode: HeatCapacityInstrumentSceneProps\['performanceMode'\];[\s\S]*position: \[number, number, number\];[\s\S]*target: \[number, number, number\];[\s\S]*fov: number;[\s\S]*actualFov: number;[\s\S]*schemeSnippet: string;/,
  'camera capture payload should include the default-view values, actual responsive FOV, and a copyable scheme snippet',
);
assert.match(
  sceneSource,
  /function HeatCapacityCameraCaptureBridge\([\s\S]*baseFov[\s\S]*useThree\(\)[\s\S]*controlsRef\.current\?\.target[\s\S]*const fov = roundCameraCaptureNumber\(baseFov\);[\s\S]*const actualFov = roundCameraCaptureNumber\(camera\.fov\);[\s\S]*window\.localStorage\.setItem\(HEAT_CAPACITY_CAMERA_CAPTURE_STORAGE_KEY, JSON\.stringify\(payload\)\)[\s\S]*new CustomEvent\('hsl:heat-capacity-camera-capture'/,
  'camera capture bridge should read the live orbit camera and publish base and responsive FOV values for inspection',
);
assert.match(
  sceneSource,
  /function HeatCapacityCameraCapturePanel\([\s\S]*data-heat-capacity-camera-capture="true"[\s\S]*data-heat-capacity-camera-capture-action="record"[\s\S]*HEAT_CAPACITY_CAMERA_CAPTURE_STORAGE_KEY/,
  'camera capture panel should expose a visible record action and the shared storage key',
);
assert.match(
  sceneSource,
  /const cameraCaptureEnabled = useMemo\(\(\) => isHeatCapacityCameraCaptureEnabled\(\), \[\]\);[\s\S]*<HeatCapacityCameraCaptureBridge[\s\S]*enabled=\{cameraCaptureEnabled\}[\s\S]*baseFov=\{cameraViewScheme\.fov\}[\s\S]*<HeatCapacityCameraCapturePanel[\s\S]*enabled=\{cameraCaptureEnabled\}/,
  'heat-capacity scene should mount the capture bridge and panel only through the dev query switch',
);
assert.match(
  sceneSource,
  /gl:\s*\{\s*preserveDrawingBuffer:\s*false\s*\}/,
  'the live WebGL renderer must not retain every frame solely for capture tooling',
);
assert.doesNotMatch(
  sceneSource,
  /\.toDataURL\(/,
  'camera-view capture should record semantic camera data without synchronously reading back the WebGL canvas',
);
assert.match(
  styleSource,
  /\.studio-heat-camera-capture-panel\s*\{[\s\S]*position:\s*absolute;[\s\S]*pointer-events:\s*auto;[\s\S]*\.studio-heat-camera-capture-output\s*\{/,
  'camera capture panel should have explicit overlay styling without relying on default page flow',
);

console.log('heatCapacityCameraCaptureTool tests passed');
