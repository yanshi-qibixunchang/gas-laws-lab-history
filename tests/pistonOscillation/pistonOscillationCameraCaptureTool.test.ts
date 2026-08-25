import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const toolPath = join(
  process.cwd(),
  'src',
  'features',
  'pistonOscillation',
  'PistonOscillationCameraCaptureTool.tsx',
);
const scenePath = join(
  process.cwd(),
  'src',
  'features',
  'pistonOscillation',
  'PistonOscillationInstrumentScene.tsx',
);
const packagePath = join(process.cwd(), 'package.json');
const agentsPath = join(process.cwd(), 'AGENTS.md');

assert.equal(existsSync(toolPath), true, 'piston camera capture tool should exist as a separate dev-only module');
assert.equal(existsSync(scenePath), true, 'piston instrument scene should exist');

const toolSource = readFileSync(toolPath, 'utf8');
const sceneSource = readFileSync(scenePath, 'utf8');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
  scripts?: Record<string, string>;
};
const agentsSource = readFileSync(agentsPath, 'utf8');

assert.equal(
  packageJson.scripts?.['dev:temp'],
  'vite --host 127.0.0.1 --port 5184 --strictPort',
  'camera adjustment should reuse the strict temporary-output server on port 5184',
);
assert.match(
  agentsSource,
  /## Temporary Output Port[\s\S]*`5184`[\s\S]*npm\.cmd run dev:temp[\s\S]*http:\/\/127\.0\.0\.1:5184\/\?cameraCapture=1/,
  'AGENTS.md should keep documenting the shared camera-capture entrypoint',
);

assert.match(
  toolSource,
  /PISTON_OSCILLATION_CAMERA_CAPTURE_QUERY_PARAM\s*=\s*['"]cameraCapture['"]/,
  'the piston tool should use the established ?cameraCapture=1 switch',
);
assert.match(
  toolSource,
  /PISTON_OSCILLATION_CAMERA_CAPTURE_STORAGE_KEY\s*=\s*['"]hsl_piston_oscillation_camera_capture_latest['"]/,
  'piston captures should use an experiment-specific localStorage record',
);
assert.match(
  toolSource,
  /PISTON_OSCILLATION_CAMERA_CAPTURE_EVENT\s*=\s*['"]hsl:piston-oscillation-camera-capture['"]/,
  'piston captures should publish an experiment-specific event',
);
assert.match(
  toolSource,
  /isPistonOscillationCameraCaptureEnabled[\s\S]*import\.meta\.env\.DEV[\s\S]*new URLSearchParams\(window\.location\.search\)[\s\S]*PISTON_OSCILLATION_CAMERA_CAPTURE_QUERY_PARAM[\s\S]*=== ['"]1['"]/,
  'the temporary panel must stay unavailable in production and without ?cameraCapture=1',
);

assert.match(
  toolSource,
  /interface PistonOscillationCameraViewCapturePayload\s*\{[\s\S]*position:\s*CameraCaptureTuple;[\s\S]*target:\s*CameraCaptureTuple;[\s\S]*direction:\s*CameraCaptureTuple;[\s\S]*targetOffset:\s*CameraCaptureTuple;[\s\S]*fov:\s*number;[\s\S]*actualFov:\s*number;[\s\S]*schemeSnippet:\s*string;/,
  'capture payload should preserve absolute inspection values and paste-ready relative camera values',
);
assert.match(
  toolSource,
  /PistonOscillationCameraCaptureBridge[\s\S]*useThree\(\)[\s\S]*camera instanceof THREE\.PerspectiveCamera[\s\S]*controlsRef\.current\.target/,
  'the bridge should read the live perspective camera and the OrbitControls target',
);
assert.match(
  toolSource,
  /const span\s*=\s*Number\.isFinite\(bounds\.span\)[\s\S]*const direction\s*=\s*valuesToCameraCaptureTuple\(\[[\s\S]*camera\.position\.x - bounds\.center\[0\]\) \/ span[\s\S]*camera\.position\.z - bounds\.center\[2\]\) \/ span/,
  'the paste-ready direction should be normalized against the reviewed model bounds',
);
assert.match(
  toolSource,
  /targetOffset[\s\S]*target[\s\S]*bounds\.center/,
  'the paste-ready orbit target should be stored relative to the model center',
);
assert.match(
  toolSource,
  /const fov\s*=\s*[^;]*baseFov[^;]*;[\s\S]*const actualFov\s*=\s*[^;]*camera\.fov[^;]*;/,
  'the payload should distinguish the stable scheme FOV from the responsive live FOV',
);
assert.match(
  toolSource,
  /window\.localStorage\.setItem\(\s*PISTON_OSCILLATION_CAMERA_CAPTURE_STORAGE_KEY,\s*JSON\.stringify\(payload\),?\s*\)[\s\S]*new CustomEvent\(PISTON_OSCILLATION_CAMERA_CAPTURE_EVENT/,
  'each capture should be inspectable through both localStorage and a namespaced browser event',
);

assert.match(
  toolSource,
  /PistonOscillationCameraCapturePanel[\s\S]*data-piston-oscillation-camera-capture="true"/,
  'the dev-only panel should expose a stable browser-test hook',
);
assert.equal(
  (toolSource.match(/<button\b/g) ?? []).length,
  2,
  'the temporary panel should contain exactly the record and copy actions',
);
assert.match(toolSource, /data-piston-oscillation-camera-capture-action="record"/);
assert.match(toolSource, /data-piston-oscillation-camera-capture-action="copy"/);
assert.match(
  toolSource,
  /navigator\.clipboard\.writeText\(payload\.schemeSnippet\)/,
  'the copy action should place only the paste-ready camera scheme on the clipboard',
);
assert.match(
  toolSource,
  /schemeSnippet[\s\S]*cameraPreset[\s\S]*direction[\s\S]*targetOffset[\s\S]*fov/,
  'the generated snippet should directly map to the selected camera preset schema',
);
assert.doesNotMatch(
  toolSource,
  /\.toDataURL\(/,
  'camera adjustment should record semantic values without synchronously reading the WebGL canvas',
);

assert.match(
  sceneSource,
  /<PistonOscillationInteractionWorkspace[\s\S]*embedded[\s\S]*initialMode="overview"/,
  'the formal scene should use the confirmed interaction workspace rather than the retired static camera shell',
);
assert.doesNotMatch(
  sceneSource,
  /PistonOscillationCameraCapture(?:Bridge|Panel)/,
  'the completed calibration controls should stay outside the formal interaction scene',
);
assert.equal(
  (sceneSource.match(/<button\b/g) ?? []).length,
  0,
  'the formal scene should delegate overlay controls to the shared interaction workspace',
);
assert.match(sceneSource, /restoreDefaultViewLabel=\{copy\.preview\.restoreDefaultView\}/);

console.log('pistonOscillationCameraCaptureTool tests passed');
