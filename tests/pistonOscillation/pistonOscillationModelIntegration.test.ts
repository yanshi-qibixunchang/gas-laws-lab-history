import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
} from '../../src/features/workbench/workbenchState.ts';
import {
  PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES,
  createPistonOscillationCameraPose,
} from '../../src/features/pistonOscillation/pistonOscillationCameraViews.ts';

const modelPath = new URL(
  '../../public/models/piston-oscillation/EX5531_TD8572A_ratio_specific_heats_final.glb',
  import.meta.url,
);
const modelSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationInstrumentModel.tsx', import.meta.url),
  'utf8',
);
const sceneSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationInstrumentScene.tsx', import.meta.url),
  'utf8',
);
const binary = readFileSync(modelPath);

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;
const EXPECTED_GLB_BYTES = 7_231_720;
const EXPECTED_GLB_SHA256 = 'BE1681B872ED89196107856E1D37C6F57AF2D812272F34A41036F5F594C947C1';

assert.equal(binary.readUInt32LE(0), GLB_MAGIC, 'the bundled model must retain the binary glTF magic');
assert.equal(binary.readUInt32LE(4), GLB_VERSION, 'the bundled model must remain glTF 2.0');
assert.equal(binary.readUInt32LE(8), binary.length, 'the GLB header length must match the actual file');
assert.equal(binary.length, EXPECTED_GLB_BYTES, 'the reviewed GLB byte length must not drift');
assert.equal(
  createHash('sha256').update(binary).digest('hex').toUpperCase(),
  EXPECTED_GLB_SHA256,
  'the bundled GLB must match the reviewed v1.2.1 asset',
);

const chunks: Array<{ type: number; payload: Buffer }> = [];
for (let offset = 12; offset < binary.length;) {
  assert.ok(offset + 8 <= binary.length, 'each GLB chunk must include a complete header');
  const chunkLength = binary.readUInt32LE(offset);
  const chunkType = binary.readUInt32LE(offset + 4);
  const chunkEnd = offset + 8 + chunkLength;
  assert.ok(chunkEnd <= binary.length, 'each GLB chunk must stay inside the declared file length');
  chunks.push({ type: chunkType, payload: binary.subarray(offset + 8, chunkEnd) });
  offset = chunkEnd;
}
assert.deepEqual(
  chunks.map((chunk) => chunk.type),
  [JSON_CHUNK_TYPE, BIN_CHUNK_TYPE],
  'the model must be a self-contained GLB with one JSON chunk and one binary chunk',
);

const gltf = JSON.parse(
  chunks[0]!.payload.toString('utf8').replace(/[\u0000\u0020]+$/u, ''),
) as {
  asset?: { version?: string; generator?: string };
  nodes?: Array<{ name?: string; extras?: Record<string, unknown> }>;
  buffers?: Array<{ byteLength?: number; uri?: string }>;
  images?: Array<{ uri?: string }>;
  animations?: unknown[];
  [key: string]: unknown;
};
assert.equal(gltf.asset?.version, '2.0');
assert.equal(gltf.asset?.generator, 'Khronos glTF Blender I/O v5.2.39');
assert.equal(gltf.animations?.length, 1, 'the source animation may remain embedded but must not be played by the app');

const requiredNodeNames = [
  'Cylinder_Pyrex',
  'PistonAssembly_MOV',
  'Piston_Graphite',
  'PistonRod',
  'MassPlatform_UpperPlate',
  'ScaleTicks_Unnumbered',
  'PressureSensor_ROOT',
  'UniversalInterface_ROOT',
  'Hose_Main_Default',
] as const;
const nodeNames = new Set((gltf.nodes ?? []).map((node) => node.name));
for (const nodeName of requiredNodeNames) {
  assert.equal(nodeNames.has(nodeName), true, `the reviewed GLB must contain node ${nodeName}`);
  assert.match(modelSource, new RegExp(`['"]${nodeName}['"]`));
}

const pistonAssembly = gltf.nodes?.find((node) => node.name === 'PistonAssembly_MOV');
assert.deepEqual(
  pistonAssembly?.extras,
  {
    interaction: 'slide_z',
    min: 0,
    max: 0.1,
    initial: 0.06,
    strokeBaseZ: 0.135,
    axis: 'local_Z',
    locked: false,
    lockedByPneumaticSealWhen: 'Connector_Main_QuickDisconnect.connected_sealed',
    freeVolumeAdjustmentWhen: 'Connector_Main_QuickDisconnect.disconnected_open_to_atmosphere',
  },
  'the piston metadata must remain available for a later interaction phase',
);

const externalUris: string[] = [];
const collectExternalUris = (value: unknown, path = 'gltf') => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectExternalUris(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, entry]) => {
    if (key === 'uri' && typeof entry === 'string') externalUris.push(`${path}.${key}=${entry}`);
    collectExternalUris(entry, `${path}.${key}`);
  });
};
collectExternalUris(gltf);
assert.deepEqual(externalUris, [], 'the bundled GLB must not depend on external buffers, images, or URLs');

assert.match(
  modelSource,
  /`\$\{import\.meta\.env\.BASE_URL\}models\/piston-oscillation\/EX5531_TD8572A_ratio_specific_heats_final\.glb`/,
  'the app must resolve the model under the configured Vite base path',
);
assert.match(modelSource, /useGLTF\(PISTON_OSCILLATION_GLB_PATH\)/);
assert.match(modelSource, /mesh\.raycast = \(\) => undefined/);
assert.match(sceneSource, /clearPistonOscillationInstrumentModelCache\(\)/);
assert.match(sceneSource, /enabled=\{!cameraTransitionActive\}/);
assert.match(sceneSource, /onTransitionActiveChange\(true\)/);
assert.match(sceneSource, /onTransitionActiveChange\(false\)/);
assert.doesNotMatch(modelSource, /\.geometry\.dispose\(\)|\.texture\.dispose\(\)|\.map\.dispose\(\)/);

const integratedSceneSource = `${modelSource}\n${sceneSource}`;
assert.doesNotMatch(integratedSceneSource, /<iframe\b/i);
assert.doesNotMatch(integratedSceneSource, /https?:\/\/|\/\/[^/]/i);
assert.doesNotMatch(
  integratedSceneSource,
  /\b(?:AnimationMixer|useAnimations|clipAction)\b|\.play\s*\(/,
  'the static competition preview must not play the embedded source animation',
);
assert.doesNotMatch(
  modelSource,
  /\bon(?:Click|DoubleClick|PointerDown|PointerUp|PointerMove|PointerOver|PointerOut)\s*=/,
  'the model itself must remain non-interactive in this delivery phase',
);

const sceneButtons = sceneSource.match(/<button\b/g) ?? [];
assert.equal(sceneButtons.length, 1, 'the normal scene must expose only the default-view reset button');
const resetButton = sceneSource.match(/<button\b[\s\S]*?<\/button>/)?.[0] ?? '';
assert.match(resetButton, /data-piston-oscillation-view-reset="true"/);
assert.match(
  resetButton,
  /className="studio-heat-view-reset"/,
  'the piston reset control should reuse the reviewed heat-capacity button styling',
);
assert.match(resetButton, /\{copy\.preview\.restoreDefaultView\}/);
assert.match(resetButton, /onClick=\{\(\) => setResetRevision\(\(revision\) => revision \+ 1\)\}/);
assert.match(sceneSource, /<OrbitControls[\s\S]*enableRotate[\s\S]*enableZoom/);
assert.doesNotMatch(
  sceneSource,
  /enableDamping=\{false\}/,
  'piston orbiting should retain Drei OrbitControls damping and release inertia',
);
assert.doesNotMatch(
  sceneSource,
  /minPolarAngle=\{0\.62\}|maxPolarAngle=\{1\.42\}/,
  'the heat-capacity vertical limits must not block the piston scene top-view preset',
);

const expectedPresets = ['overview', 'front', 'side', 'top'] as const;
assert.deepEqual(WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS, expectedPresets);
assert.deepEqual(Object.keys(PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES), expectedPresets);
assert.deepEqual(PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES.overview, {
  direction: [0.316, 0.257, 0.98],
  targetOffset: [0.004, -0.112, 0.031],
  fov: 38,
});
const modelBounds = { center: [0.4, -0.3, 0.8] as [number, number, number], span: 2.75 };
const presetPositions = new Set<string>();
for (const preset of WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS) {
  const pose = createPistonOscillationCameraPose(preset, modelBounds);
  assert.equal(pose.position.length, 3);
  assert.equal(pose.target.length, 3);
  assert.equal(
    [...pose.position, ...pose.target, pose.fov].every(Number.isFinite),
    true,
    `${preset} must produce a finite camera pose`,
  );
  assert.ok(pose.fov > 0 && pose.fov < 180, `${preset} must produce a valid perspective FOV`);
  assert.notDeepEqual(pose.position, pose.target, `${preset} camera must not occupy its orbit target`);
  presetPositions.add(pose.position.join(':'));
}
assert.equal(presetPositions.size, expectedPresets.length, 'each camera preset must produce a distinct view');

console.log('pistonOscillationModelIntegration tests passed');
