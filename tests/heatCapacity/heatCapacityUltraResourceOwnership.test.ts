import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  cloneHeatCapacityUltraModelScene,
  disposeHeatCapacityUltraOwnedModelResources,
  hasHeatCapacityUltraSingleRelativePositionAndNormalMorph,
  HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY,
  specializeHeatCapacityUltraSingleMorphMaterial,
  specializeHeatCapacityUltraSingleMorphVertexShader,
} from '../../src/features/heatCapacity/heatCapacityUltraResourceOwnership.ts';

const sourceGeometry = new THREE.BoxGeometry();
const sharedTexture = new THREE.Texture();
const sourceMaterial = new THREE.MeshStandardMaterial({ map: sharedTexture });
const sourceRoot = new THREE.Group();
sourceRoot.add(new THREE.Mesh(sourceGeometry, sourceMaterial));

const cloned = cloneHeatCapacityUltraModelScene(sourceRoot);
const clonedMesh = cloned.root.children[0] as THREE.Mesh;
assert.equal(clonedMesh.geometry, sourceGeometry, 'useGLTF geometry must remain shared and component-unowned');
assert.notEqual(clonedMesh.material, sourceMaterial, 'component-owned material must be cloned');
assert.equal((clonedMesh.material as THREE.MeshStandardMaterial).map, sharedTexture, 'useGLTF texture must remain shared');

let clonedMaterialDisposeCount = 0;
let sourceMaterialDisposeCount = 0;
let sourceGeometryDisposeCount = 0;
let sharedTextureDisposeCount = 0;
(clonedMesh.material as THREE.Material).addEventListener('dispose', () => { clonedMaterialDisposeCount += 1; });
sourceMaterial.addEventListener('dispose', () => { sourceMaterialDisposeCount += 1; });
sourceGeometry.addEventListener('dispose', () => { sourceGeometryDisposeCount += 1; });
sharedTexture.addEventListener('dispose', () => { sharedTextureDisposeCount += 1; });

disposeHeatCapacityUltraOwnedModelResources(cloned.ownedMaterials);
assert.equal(clonedMaterialDisposeCount, 1);
assert.equal(sourceMaterialDisposeCount, 0);
assert.equal(sourceGeometryDisposeCount, 0);
assert.equal(sharedTextureDisposeCount, 0);
assert.equal(cloned.ownedMaterials.size, 0);

for (let retry = 0; retry < 50; retry += 1) {
  const retryClone = cloneHeatCapacityUltraModelScene(sourceRoot);
  assert.equal(retryClone.ownedMaterials.size, 1);
  disposeHeatCapacityUltraOwnedModelResources(retryClone.ownedMaterials);
  assert.equal(retryClone.ownedMaterials.size, 0);
}
assert.equal(sourceMaterialDisposeCount, 0, 'runtime retries must never dispose the cached GLTF material');
assert.equal(sourceGeometryDisposeCount, 0, 'runtime retries must never dispose cached GLTF geometry');
assert.equal(sharedTextureDisposeCount, 0, 'runtime retries must never dispose cached GLTF textures');

const createSingleMorphGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0], 3));
  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute([0, -0.1, 0], 3)];
  geometry.morphAttributes.normal = [new THREE.Float32BufferAttribute([0, 0, 0], 3)];
  geometry.morphTargetsRelative = true;
  return geometry;
};

const pumpBulbSource = new THREE.Mesh(
  createSingleMorphGeometry(),
  new THREE.MeshPhysicalMaterial(),
);
pumpBulbSource.name = 'Pump_Bulb';
pumpBulbSource.updateMorphTargets();
const nonPumpSource = pumpBulbSource.clone();
nonPumpSource.name = 'Pump_RearSoftEnd';
const morphSourceRoot = new THREE.Group();
morphSourceRoot.add(pumpBulbSource, nonPumpSource);

const morphClone = cloneHeatCapacityUltraModelScene(morphSourceRoot);
const clonedPumpBulb = morphClone.root.getObjectByName('Pump_Bulb') as THREE.Mesh;
const clonedNonPump = morphClone.root.getObjectByName('Pump_RearSoftEnd') as THREE.Mesh;
const pumpBulbMaterial = clonedPumpBulb.material as THREE.Material;
const nonPumpMaterial = clonedNonPump.material as THREE.Material;
assert.match(
  pumpBulbMaterial.customProgramCacheKey(),
  new RegExp(`${HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY}$`),
  'the exact single-morph Pump_Bulb material should use the specialized program cache key',
);
assert.doesNotMatch(
  nonPumpMaterial.customProgramCacheKey(),
  new RegExp(HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY),
  'other meshes must keep the standard Three.js shader path',
);

const standardVertexShader = `
#include <morphnormal_vertex>
#include <morphtarget_vertex>
`;
const specializedVertexShader = specializeHeatCapacityUltraSingleMorphVertexShader(
  standardVertexShader,
);
const shaderParameters = {
  vertexShader: standardVertexShader,
  fragmentShader: '',
  uniforms: {},
} as Parameters<THREE.Material['onBeforeCompile']>[0];
pumpBulbMaterial.onBeforeCompile(shaderParameters, {} as THREE.WebGLRenderer);
assert.equal(
  shaderParameters.vertexShader,
  specializedVertexShader,
  'the cloned Pump_Bulb material should apply the loop-free shader during compilation',
);
assert.doesNotMatch(specializedVertexShader, /#include <morph(?:normal|target)_vertex>/);
assert.doesNotMatch(specializedVertexShader, /for\s*\(/);
assert.match(specializedVertexShader, /getMorph\( gl_VertexID, 0, 1 \)/);
assert.match(specializedVertexShader, /getMorph\( gl_VertexID, 0, 0 \)/);
assert.match(specializedVertexShader, /morphTargetInfluences\[ 0 \]/);

const focusShellMaterial = new THREE.MeshBasicMaterial();
specializeHeatCapacityUltraSingleMorphMaterial(focusShellMaterial);
specializeHeatCapacityUltraSingleMorphMaterial(focusShellMaterial);
assert.equal(
  focusShellMaterial.customProgramCacheKey().split(HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY).length - 1,
  1,
  'derived focus-shell materials should receive the single-morph specialization only once',
);
const focusShellShaderParameters = {
  vertexShader: standardVertexShader,
  fragmentShader: '',
  uniforms: {},
} as Parameters<THREE.Material['onBeforeCompile']>[0];
focusShellMaterial.onBeforeCompile(focusShellShaderParameters, {} as THREE.WebGLRenderer);
assert.equal(focusShellShaderParameters.vertexShader, specializedVertexShader);
focusShellMaterial.dispose();

disposeHeatCapacityUltraOwnedModelResources(morphClone.ownedMaterials);

const incompatiblePumpGeometry = createSingleMorphGeometry();
incompatiblePumpGeometry.morphAttributes.position?.push(
  new THREE.Float32BufferAttribute([0, -0.2, 0], 3),
);
incompatiblePumpGeometry.morphAttributes.normal?.push(
  new THREE.Float32BufferAttribute([0, 0, 0], 3),
);
assert.equal(
  hasHeatCapacityUltraSingleRelativePositionAndNormalMorph(incompatiblePumpGeometry),
  false,
  'the loop-free shader contract must reject geometry with more than one morph target',
);
const colorMorphGeometry = createSingleMorphGeometry();
colorMorphGeometry.morphAttributes.color = [
  new THREE.Float32BufferAttribute([0.1, 0.1, 0.1], 3),
];
assert.equal(
  hasHeatCapacityUltraSingleRelativePositionAndNormalMorph(colorMorphGeometry),
  false,
  'the loop-free position/normal shader contract must reject an additional color morph',
);
const colorOnlyMorphGeometry = new THREE.BufferGeometry();
colorOnlyMorphGeometry.morphTargetsRelative = true;
colorOnlyMorphGeometry.morphAttributes.color = [
  new THREE.Float32BufferAttribute([0.1, 0.1, 0.1], 3),
];
assert.equal(
  hasHeatCapacityUltraSingleRelativePositionAndNormalMorph(colorOnlyMorphGeometry),
  false,
  'a color-only morph must not be mistaken for the exact Pump_Bulb shader contract',
);
const incompatiblePumpSource = new THREE.Mesh(
  incompatiblePumpGeometry,
  new THREE.MeshPhysicalMaterial(),
);
incompatiblePumpSource.name = 'Pump_Bulb';
incompatiblePumpSource.updateMorphTargets();
const incompatiblePumpClone = cloneHeatCapacityUltraModelScene(incompatiblePumpSource);
const incompatiblePumpMaterial = (incompatiblePumpClone.root as THREE.Mesh).material as THREE.Material;
assert.doesNotMatch(
  incompatiblePumpMaterial.customProgramCacheKey(),
  new RegExp(HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY),
  'a Pump_Bulb asset with more than one morph target must keep the standard shader path',
);
disposeHeatCapacityUltraOwnedModelResources(incompatiblePumpClone.ownedMaterials);

console.log('heatCapacityUltraResourceOwnership tests passed');
