import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const benchPath = new URL(
  '../../public/models/shared/unified-light-lab-bench.glb',
  import.meta.url,
);
const provenancePath = new URL(
  '../../public/models/shared/unified-light-lab-bench.provenance.json',
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
const binary = readFileSync(benchPath);
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8')) as {
  asset?: string;
  sha256?: string;
  bytes?: number;
  visualProfile?: string;
  runtimeNotes?: {
    darkThemeAdaptation?: boolean;
    pistonOscillationSourceTabletopVisible?: boolean;
  };
};

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;
const EXPECTED_GLB_BYTES = 61_620;
const EXPECTED_GLB_SHA256 = 'B958ACB495AF791A25E6EAC9922551DF6718C53C60096249B3A221FB0B680505';

assert.equal(binary.readUInt32LE(0), GLB_MAGIC);
assert.equal(binary.readUInt32LE(4), GLB_VERSION);
assert.equal(binary.readUInt32LE(8), binary.length);
assert.equal(binary.length, EXPECTED_GLB_BYTES);
assert.equal(
  createHash('sha256').update(binary).digest('hex').toUpperCase(),
  EXPECTED_GLB_SHA256,
);

const chunks: Array<{ type: number; payload: Buffer }> = [];
for (let offset = 12; offset < binary.length;) {
  const chunkLength = binary.readUInt32LE(offset);
  const chunkType = binary.readUInt32LE(offset + 4);
  const chunkEnd = offset + 8 + chunkLength;
  assert.ok(chunkEnd <= binary.length);
  chunks.push({ type: chunkType, payload: binary.subarray(offset + 8, chunkEnd) });
  offset = chunkEnd;
}
assert.deepEqual(
  chunks.map((chunk) => chunk.type),
  [JSON_CHUNK_TYPE, BIN_CHUNK_TYPE],
);

const gltf = JSON.parse(
  chunks[0]!.payload.toString('utf8').replace(/[\u0000\u0020]+$/u, ''),
) as {
  asset?: {
    version?: string;
    generator?: string;
    extras?: Record<string, unknown>;
  };
  nodes?: Array<{ name?: string; extras?: Record<string, unknown> }>;
  materials?: Array<{ name?: string }>;
  images?: Array<{ uri?: string; mimeType?: string }>;
  animations?: unknown[];
  [key: string]: unknown;
};
assert.equal(gltf.asset?.version, '2.0');
assert.equal(gltf.asset?.generator, 'Gas Laws Lab unified light lab bench extractor v1');
assert.equal(gltf.asset?.extras?.visualProfile, 'light');
assert.equal(gltf.animations, undefined);
assert.equal(gltf.materials?.[0]?.name, 'mat_blue_black_chemical_resistant_bench');
assert.equal(gltf.images?.[0]?.mimeType, 'image/png');

const requiredBenchNodeNames = [
  'Unified_Light_LabBench',
  'Unified_Light_LabBench_Surface',
  'Unified_Light_LabBench_Backstop',
] as const;
const nodeNames = new Set((gltf.nodes ?? []).map((node) => node.name));
for (const nodeName of requiredBenchNodeNames) {
  assert.equal(nodeNames.has(nodeName), true, `the shared light bench must contain ${nodeName}`);
  assert.match(modelSource, new RegExp(`['"]${nodeName}['"]`));
}

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
assert.deepEqual(externalUris, []);

assert.equal(provenance.asset, 'unified-light-lab-bench.glb');
assert.equal(provenance.sha256, EXPECTED_GLB_SHA256);
assert.equal(provenance.bytes, EXPECTED_GLB_BYTES);
assert.equal(provenance.visualProfile, 'light');
assert.equal(provenance.runtimeNotes?.darkThemeAdaptation, false);
assert.equal(provenance.runtimeNotes?.pistonOscillationSourceTabletopVisible, false);

assert.match(
  modelSource,
  /models\/shared\/unified-light-lab-bench\.glb/,
);
assert.match(
  modelSource,
  /useGLTF\(\s*PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_GLB_PATH,\s*\)/,
);
assert.match(modelSource, /sourceTabletop\.visible = false/);
assert.match(modelSource, /position:\s*\[-0\.1,\s*0,\s*-0\.1146875\]/);
assert.match(
  modelSource,
  /scale:\s*\[0\.19230769230769232,\s*0\.16666666666666666,\s*0\.28125\]/,
);
assert.match(
  sceneSource,
  /unifiedLightLabBenchSourceScene=\{unifiedLightLabBenchSourceScene\}/,
);
assert.doesNotMatch(
  modelSource,
  /sceneTheme|darkTheme|darkTabletop|darkBench/,
  'this delivery must keep one reviewed light bench without premature dark-theme adaptation',
);

console.log('pistonOscillationUnifiedLightLabBench tests passed');
