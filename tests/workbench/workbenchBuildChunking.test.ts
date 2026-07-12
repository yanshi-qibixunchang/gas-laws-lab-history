import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const viteConfigSource = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const buildPolicy = require('../../build/workbenchBuildPolicy.cjs') as {
  WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES: number;
  WORKBENCH_REQUIRED_CHUNK_NAMES: string[];
  getWorkbenchChunkName: (id: string) => string | null;
};

assert.equal(buildPolicy.getWorkbenchChunkName('C:\\repo\\node_modules\\three\\src\\Three.js'), 'react-three');
assert.equal(buildPolicy.getWorkbenchChunkName('/repo/node_modules/three/examples/jsm/controls/OrbitControls.js'), 'react-three');
assert.equal(buildPolicy.getWorkbenchChunkName('/repo/node_modules/@react-three/fiber/dist/index.js'), 'react-three');
assert.equal(buildPolicy.getWorkbenchChunkName('/repo/node_modules/react-dom/index.js'), 'vendor');
assert.equal(buildPolicy.getWorkbenchChunkName('/repo/src/audio/core/audioEngine.ts'), 'audio');
assert.equal(
  buildPolicy.getWorkbenchChunkName('/repo/src/features/heatCapacity/HeatCapacityInstrumentScene.tsx'),
  'heat-capacity-scene',
);
assert.equal(
  buildPolicy.getWorkbenchChunkName('/repo/src/features/heatCapacity/HeatCapacityUltraInstrumentModel.tsx'),
  'heat-capacity-scene',
);
assert.equal(
  buildPolicy.getWorkbenchChunkName('/repo/src/features/heatCapacity/HeatCapacityHardSphereLayer.tsx'),
  'heat-capacity-scene',
);
assert.equal(
  buildPolicy.getWorkbenchChunkName('/repo/src/features/heatCapacity/heatCapacityQualityProfiles.ts'),
  'heat-capacity-scene',
);
assert.equal(buildPolicy.getWorkbenchChunkName('/repo/src/main.tsx'), null);
assert.deepEqual(buildPolicy.WORKBENCH_REQUIRED_CHUNK_NAMES, ['vendor', 'react-three', 'heat-capacity-scene', 'audio']);
assert.equal(buildPolicy.WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES, 1_000_000);
assert.match(
  viteConfigSource,
  /strictExecutionOrder:\s*true[\s\S]*codeSplitting:\s*\{[\s\S]*includeDependenciesRecursively:\s*false,[\s\S]*groups: \[\{ name: getWorkbenchChunkName \}\]/,
);
assert.match(viteConfigSource, /chunkSizeWarningLimit: WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES \/ 1000/);
assert.doesNotMatch(viteConfigSource, /manualChunks/);

console.log('workbenchBuildChunking tests passed');
